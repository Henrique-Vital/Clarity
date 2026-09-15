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
    const marks = loadMarks();
    if (marks[key]) return;

    running = true;
    try {
      const res = await window.PortariaBackup.save();
      marks[key] = new Date().toISOString();
      saveMarks(marks);
      console.log('[backup-auto] backup gerado automaticamente:', res && res.fileName);
    } catch (e) {
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
