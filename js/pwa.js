/* ===================================================================
   CLARITY GLASS - PORTARIA - PWA.JS (VERSÃO WEB)
   ===================================================================
   - Registra o service worker (sw.js).
   - Verifica atualizações ao abrir, ao voltar para a aba e a cada 30 min.
   - Quando há uma versão nova, mostra um banner com o botão
     "Atualizar agora". Ao clicar, o novo service worker assume e a
     página é recarregada já na versão nova.
   - Também captura o prompt de instalação do PWA, quando disponível.

   Requisitos: HTTPS ou localhost/127.0.0.1. Em file:// o registro é
   ignorado (service worker não funciona).
   =================================================================== */

(function () {
  'use strict';

  var script = document.currentScript;
  if (!script) return;

  var base = new URL('../', script.src).href;
  var UPDATE_INTERVAL = 30 * 60 * 1000;
  var FOCUS_INTERVAL = 5 * 60 * 1000;
  var RELOAD_FALLBACK = 5000;
  var DISMISS_KEY = 'clarityUpdateDismissed';

  var installPrompt = null;
  var registration = null;
  var waitingWorker = null;
  var banner = null;
  var updateButton = null;
  var dismissed = false;
  var lastCheck = 0;
  var firstControllerChange = !navigator.serviceWorker || !navigator.serviceWorker.controller;

  try {
    dismissed = sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch (e) {
    dismissed = false;
  }

  function isLocalHost(host) {
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  }

  function canUseServiceWorker() {
    if (!('serviceWorker' in navigator)) return false;
    if (location.protocol === 'https:') return true;
    return location.protocol === 'http:' && isLocalHost(location.hostname);
  }

  function pwaApi() {
    if (!window.PortariaPWA) {
      window.PortariaPWA = {
        canInstall: false,
        install: function () { return Promise.resolve(false); },
        checkForUpdate: function () { checkForUpdate(true); },
        applyUpdate: applyUpdate,
        isUpdateAvailable: function () { return !!waitingWorker; }
      };
    }
    return window.PortariaPWA;
  }

  // ===== PROMPT DE INSTALAÇÃO DO NAVEGADOR =====
  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    installPrompt = event;
    var api = pwaApi();
    api.canInstall = true;
    api.install = function () {
      if (!installPrompt) return Promise.resolve(false);
      var prompt = installPrompt;
      prompt.prompt();
      return prompt.userChoice.then(function (choice) {
        var accepted = choice && choice.outcome === 'accepted';
        if (accepted) installPrompt = null;
        api.canInstall = !!installPrompt;
        return accepted;
      });
    };
    document.dispatchEvent(new CustomEvent('portaria:pwa-installable'));
  });

  window.addEventListener('appinstalled', function () {
    installPrompt = null;
    var api = pwaApi();
    api.canInstall = false;
    api.install = function () { return Promise.resolve(false); };
  });

  pwaApi();

  if (!canUseServiceWorker()) return;

  // ===== BANNER "NOVA VERSÃO DISPONÍVEL" =====
  var BANNER_ID = 'pwaUpdateBanner';

  function ensureBanner() {
    if (banner) return banner;

    var style = document.createElement('style');
    style.textContent = [
      '#' + BANNER_ID + '{position:fixed;left:16px;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:2147483000;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:14px 16px;border-radius:12px;background:#fff;color:#1f2937;box-shadow:0 10px 30px rgba(15,23,42,.22);border:1px solid #dbe3ee;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}',
      '#' + BANNER_ID + ' .pwa-update-text{display:flex;flex-direction:column;gap:2px;min-width:220px;flex:1}',
      '#' + BANNER_ID + ' strong{font-size:15px;color:#0f172a}',
      '#' + BANNER_ID + ' span{font-size:13px;color:#475569}',
      '#' + BANNER_ID + ' .pwa-update-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
      '#' + BANNER_ID + ' button{border:0;border-radius:8px;padding:9px 14px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}',
      '#' + BANNER_ID + ' .pwa-update-now{background:#1a73e8;color:#fff}',
      '#' + BANNER_ID + ' .pwa-update-now:hover{background:#1557b0}',
      '#' + BANNER_ID + ' .pwa-update-later{background:transparent;color:#475569}',
      '#' + BANNER_ID + ' .pwa-update-later:hover{background:#eef2f7}',
      '#' + BANNER_ID + ' button:disabled{opacity:.65;cursor:default}',
      '@media(max-width:520px){#' + BANNER_ID + ' .pwa-update-actions{width:100%}#' + BANNER_ID + ' .pwa-update-now{flex:1}}'
    ].join('');
    document.head.appendChild(style);

    banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    banner.hidden = true;

    var text = document.createElement('div');
    text.className = 'pwa-update-text';
    var title = document.createElement('strong');
    title.textContent = 'Nova versão disponível';
    var message = document.createElement('span');
    message.textContent = 'Atualize para continuar usando a versão mais recente do sistema.';
    text.appendChild(title);
    text.appendChild(message);

    var actions = document.createElement('div');
    actions.className = 'pwa-update-actions';

    var later = document.createElement('button');
    later.type = 'button';
    later.className = 'pwa-update-later';
    later.textContent = 'Agora não';
    later.addEventListener('click', function () {
      dismissed = true;
      try {
        sessionStorage.setItem(DISMISS_KEY, '1');
      } catch (e) {
        // sessionStorage indisponível (modo privado): ignora.
      }
      hideUpdateBanner();
    });

    updateButton = document.createElement('button');
    updateButton.type = 'button';
    updateButton.className = 'pwa-update-now';
    updateButton.textContent = 'Atualizar agora';
    updateButton.addEventListener('click', applyUpdate);

    actions.appendChild(later);
    actions.appendChild(updateButton);
    banner.appendChild(text);
    banner.appendChild(actions);
    document.body.appendChild(banner);
    return banner;
  }

  function showUpdateBanner(worker) {
    if (!worker || !navigator.serviceWorker.controller) return;
    waitingWorker = worker;
    if (dismissed) return;
    ensureBanner().hidden = false;
  }

  function hideUpdateBanner() {
    if (banner) banner.hidden = true;
    if (updateButton) {
      updateButton.disabled = false;
      updateButton.textContent = 'Atualizar agora';
    }
  }

  function applyUpdate() {
    if (!waitingWorker) return;
    if (updateButton) {
      updateButton.disabled = true;
      updateButton.textContent = 'Atualizando...';
    }
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    // Se o novo service worker não assumir rapidamente (por exemplo,
    // com a aba em segundo plano), recarrega mesmo assim.
    window.setTimeout(function () {
      window.location.reload();
    }, RELOAD_FALLBACK);
  }

  // ===== REGISTRO E VERIFICAÇÃO DE ATUALIZAÇÕES =====
  function watchWorker(worker) {
    if (!worker) return;
    if (worker.state === 'installed') {
      showUpdateBanner(worker);
      return;
    }
    worker.addEventListener('statechange', function () {
      if (worker.state === 'installed') showUpdateBanner(worker);
    });
  }

  function trackRegistration(reg) {
    registration = reg;
    if (reg.waiting) watchWorker(reg.waiting);
    if (reg.installing) watchWorker(reg.installing);
    reg.addEventListener('updatefound', function () {
      if (reg.installing) watchWorker(reg.installing);
    });
  }

  function checkForUpdate(force) {
    if (!registration) return;
    var now = Date.now();
    if (!force && now - lastCheck < FOCUS_INTERVAL) return;
    lastCheck = now;
    registration.update().catch(function () {
      // Sem conexão ou verificação indisponível: tenta de novo depois.
    });
  }

  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (firstControllerChange) {
      firstControllerChange = false;
      return;
    }
    window.location.reload();
  });

  function register() {
    navigator.serviceWorker
      .register(base + 'sw.js', { scope: base, updateViaCache: 'none' })
      .then(function (reg) {
        trackRegistration(reg);
        checkForUpdate(true);
        window.setInterval(function () { checkForUpdate(true); }, UPDATE_INTERVAL);
        if (navigator.storage && navigator.storage.persist) {
          navigator.storage.persist().catch(function () {});
        }
      })
      .catch(function (error) {
        console.warn('Service worker não registrado:', error);
      });
  }

  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') checkForUpdate(false);
  });
  window.addEventListener('focus', function () {
    checkForUpdate(false);
  });
})();
