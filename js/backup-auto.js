/* ===================================================================
   CLARITY GLASS - PORTARIA - BACKUP-AUTO.JS
   ===================================================================
   Agendador do Backup Geral automático. Carregado em todas as páginas.

   - Salva o JSON automaticamente às 06:00 e às 18:00 (horário local),
     sem nenhuma confirmação/janela.
   - Ao abrir o sistema após um horário perdido, faz "catch-up": gera o
     backup do horário mais recente que já passou e ainda não foi feito.
   - Controle de "já feito" por dia+horário em localStorage
     (clarityBackupAuto), evitando backups repetidos.
   - Limitação: só roda com o sistema aberto (aplicação local).
   =================================================================== */

(function () {
  'use strict';

  const SLOTS = ['06:00', '18:00'];
  const KEY = 'clarityBackupAuto';
  const STATUS_KEY = 'clarityBackupAutoStatus';
  const LOCK_NAME = 'clarity-backup-auto';
  const LOCK_KEY = 'clarityBackupAutoLock';
  let running = false;

  function todayStr() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function nowMinutes() {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  function slotMinutes(s) {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  }

  function loadMarks() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function saveMarks(marks) {
    try {
      localStorage.setItem(KEY, JSON.stringify(marks));
    } catch (e) {
      // ignora falha de escrita
    }
  }

  function recordStatus(status) {
    try {
      localStorage.setItem(STATUS_KEY, JSON.stringify(status));
    } catch (e) {
      // ignora falha de escrita
    }
  }

  /** Evita que duas abas/janelas gerem o mesmo backup ao mesmo tempo. */
  async function withLock(fn) {
    if (navigator.locks && typeof navigator.locks.request === 'function') {
      try {
        return await navigator.locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) => {
          if (!lock) return { skipped: true };
          return fn();
        });
      } catch (e) {
        // segue para o bloqueio por localStorage
      }
    }
    const now = Date.now();
    let held = 0;
    try {
      held = Number(localStorage.getItem(LOCK_KEY) || 0);
    } catch (e) {
      held = 0;
    }
    if (held && now - held < 120000) return { skipped: true };
    try {
      localStorage.setItem(LOCK_KEY, String(now));
    } catch (e) {
      // sem localStorage: segue sem bloqueio
    }
    try {
      return await fn();
    } finally {
      try {
        localStorage.removeItem(LOCK_KEY);
      } catch (e) {
        // ignora
      }
    }
  }

  /** Horário mais recente que já passou (06:00 ou 18:00). */
  function latestDueSlot() {
    const now = nowMinutes();
    let due = null;
    SLOTS.forEach((s) => {
      if (now >= slotMinutes(s)) due = s;
    });
    return due;
  }

  async function maybeRun() {
    if (running) return;
    if (!window.PortariaBackup || typeof window.PortariaBackup.save !== 'function') return;
    const slot = latestDueSlot();
    if (!slot) return;

    const key = todayStr() + '|' + slot;
    if (loadMarks()[key]) return;

    running = true;
    try {
      const outcome = await withLock(async () => {
        const marks = loadMarks();
        if (marks[key]) return { skipped: true };

        const res = await window.PortariaBackup.save({ requireData: true, requireFolder: true });
        const status = {
          at: new Date().toISOString(),
          slot,
          key,
          ok: !!(res && res.ok),
          empty: !!(res && res.empty),
          fallback: !!(res && res.fallback),
          totalRegistros: res ? res.totalRegistros : 0,
          fileName: res ? res.fileName : null,
          origem: res ? res.origem : null,
          motivo: !res ? 'sem-resultado'
            : res.empty ? 'banco-sem-dados'
              : res.motivo || (!res.ok ? 'falha-ao-salvar' : null)
        };
        recordStatus(status);

        if (!res || !res.ok) {
          console.warn('[backup-auto] backup automático não realizado:', status.motivo, status);
          return { ok: false, res, status };
        }

        marks[key] = new Date().toISOString();
        saveMarks(marks);
        console.log('[backup-auto] backup automático salvo:', res.fileName, '- registros:', res.totalRegistros);
        return { ok: true, res, status };
      });
      if (outcome && outcome.skipped) return;
    } catch (e) {
      recordStatus({
        at: new Date().toISOString(),
        slot,
        key,
        ok: false,
        motivo: 'erro',
        erro: String((e && e.message) || e)
      });
      console.warn('[backup-auto] falha ao gerar o backup automático:', e);
    } finally {
      running = false;
    }
  }

  function start() {
    // Aguarda as libs/serviços carregarem e tenta de imediato (catch-up).
    setTimeout(maybeRun, 4000);
    setInterval(maybeRun, 60000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
