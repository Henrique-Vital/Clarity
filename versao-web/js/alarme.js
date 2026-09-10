/* ===================================================================
   CLARITY GLASS - PORTARIA - ALARME.JS
   ===================================================================
   Verificador global de alarmes de avisos e recados.
   Carregado em todas as páginas para que o alarme toque em qualquer
   tela do sistema. Lê a store "avisos" do IndexedDB a cada 20s.
   =================================================================== */
(function () {
  if (window.__clarityAlarmeLoaded) return;
  window.__clarityAlarmeLoaded = true;

  const CHECK_INTERVAL = 20000;

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function nowParts() {
    const d = new Date();
    return {
      date: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()),
      hm: pad(d.getHours()) + ':' + pad(d.getMinutes()),
      day: d.getDay(),
      seconds: d.getSeconds()
    };
  }

  function esc(s) {
    const div = document.createElement('div');
    div.textContent = s == null ? '' : String(s);
    return div.innerHTML;
  }

  // ===== DEDUPLICAÇÃO (evita disparar o mesmo alarme duas vezes) =====
  function getFiredList() {
    try {
      return JSON.parse(localStorage.getItem('clarity_alarme_disparados') || '[]');
    } catch (e) {
      return [];
    }
  }

  function hasFired(key) {
    return getFiredList().includes(key);
  }

  function markFired(key) {
    const list = getFiredList();
    list.push(key);
    if (list.length > 500) list.splice(0, list.length - 500);
    try {
      localStorage.setItem('clarity_alarme_disparados', JSON.stringify(list));
    } catch (e) { /* ignore */ }
  }

  // ===== REGRAS DE DISPARO =====
  function isDue(r, now) {
    if (!r.alarme) return false;
    const hora = r.alarmeHora || r.hora;
    if (!hora || hora !== now.hm) return false;
    if (now.seconds >= 25) return false;

    const rec = r.recorrencia || 'data';
    if (rec === 'diario') return true;
    if (rec === 'semanal') return String(r.diaSemana) === String(now.day);
    if (rec === 'data') return (r.alarmeData || r.data) === now.date;
    return true;
  }

  // ===== SOM (beep via WebAudio) =====
  function beep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const t0 = ctx.currentTime;
      [0, 0.35, 0.7].forEach((t) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, t0 + t);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + t + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0 + t);
        osc.stop(t0 + t + 0.28);
      });
    } catch (e) { /* ignore */ }
  }

  // ===== OVERLAY GRANDE NA TELA =====
  function showOverlay(avisos) {
    if (document.getElementById('clarityAlarmeOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'clarityAlarmeOverlay';
    overlay.className = 'alarme-overlay';
    const items = avisos.map((a) => `
      <div class="alarme-item">
        <div class="alarme-item-hora">${esc(a.alarmeHora || a.hora)}</div>
        <div class="alarme-item-nome">Deixado por: ${esc(a.nome)}</div>
        <div class="alarme-item-texto">${esc(a.texto)}</div>
      </div>
    `).join('');
    overlay.innerHTML = `
      <div class="alarme-box">
        <div class="alarme-icon"><i class="fas fa-bullhorn"></i></div>
        <h2 class="alarme-title">ALARME DE AVISO</h2>
        <div class="alarme-aviso-hora">${esc(avisos[0].alarmeHora || avisos[0].hora)}</div>
        ${items}
        <button class="btn btn-primary btn-lg" id="clarityAlarmeClose">
          <i class="fas fa-check"></i> OK, entendi
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('clarityAlarmeClose').addEventListener('click', () => overlay.remove());
  }

  // ===== VERIFICAÇÃO =====
  async function check() {
    let avisos;
    try {
      avisos = await DB.store('avisos').getAll();
    } catch (e) {
      return;
    }
    const now = nowParts();
    const due = avisos.filter((r) => {
      if (!isDue(r, now)) return false;
      const key = r.id + ':' + now.date + ':' + (r.alarmeHora || '');
      if (hasFired(key)) return false;
      markFired(key);
      return true;
    });
    if (!due.length) return;

    beep();
    showOverlay(due);

    try {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          const n = new Notification('Alarme de Aviso - Clarity Glass', {
            body: due[0].texto,
            icon: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' rx=\'20\' fill=\'%23f39c12\'/%3E%3Ctext x=\'50\' y=\'68\' font-size=\'45\' text-anchor=\'middle\' fill=\'white\'%3E%F0%9F%93%A3%3C/text%3E%3C/svg%3E'
          });
          setTimeout(() => n.close(), 15000);
        } else if (Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }
    } catch (e) { /* ignore */ }
  }

  function start() {
    setTimeout(() => {
      check();
      setInterval(check, CHECK_INTERVAL);
    }, 2000);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    start();
  } else {
    document.addEventListener('DOMContentLoaded', start);
  }
})();
