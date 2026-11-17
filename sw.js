/* ===================================================================
   CLARITY GLASS - PORTARIA - SERVICE WORKER (VERSÃO WEB)
   ===================================================================
   Cache offline do PWA. Estratégias:
   - Navegação: network-first, com fallback para o cache (a página
     visitada, a mesma rota com "index.html" ou o Dashboard).
   - Arquivos estáticos: cache-first.

   ATUALIZAÇÕES:
   - A nova versão NÃO assume sozinha (sem skipWaiting no install).
   - O js/pwa.js detecta a versão nova e mostra o banner
     "Atualizar agora"; ao clicar, envia SKIP_WAITING e recarrega.
   - Ao publicar qualquer alteração, incremente CACHE_NAME para que os
     usuários baixem os arquivos novos em um cache separado.
   =================================================================== */

const CACHE_NAME = 'portaria-clarity-web-v1.1.0';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',

  './css/base.css',
  './css/dashboard.css',

  './js/logo.js',
  './js/martseg.js',
  './js/ui.js',
  './js/db.js',
  './js/portaria.js',
  './js/alarme.js',
  './js/backup.js',
  './js/backup-auto.js',
  './js/dashboard.js',
  './js/portaria-services-web.js',
  './js/pwa.js',

  './libs/font-awesome/css/all.min.css',
  './libs/font-awesome/webfonts/fa-brands-400.woff2',
  './libs/font-awesome/webfonts/fa-regular-400.woff2',
  './libs/font-awesome/webfonts/fa-solid-900.woff2',
  './libs/font-awesome/webfonts/fa-v4compatibility.woff2',
  './libs/jspdf/jspdf.umd.min.js',
  './libs/jspdf-autotable/jspdf.plugin.autotable.min.js',
  './libs/xlsx/xlsx.full.min.js',

  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-32.png',

  './controle-de-chaves/index.html',
  './controle-de-chaves/style.css',
  './controle-de-chaves/script.js',

  './controle-de-visitantes/index.html',
  './controle-de-visitantes/style.css',
  './controle-de-visitantes/script.js',

  './controle-de-epis/index.html',
  './controle-de-epis/style.css',
  './controle-de-epis/script.js',

  './controle-de-insumos-primeiros-socorros/index.html',
  './controle-de-insumos-primeiros-socorros/style.css',
  './controle-de-insumos-primeiros-socorros/script.js',

  './controle-de-avisos/index.html',
  './controle-de-avisos/style.css',
  './controle-de-avisos/script.js',

  './controle-de-ocorrencias/index.html',
  './controle-de-ocorrencias/style.css',
  './controle-de-ocorrencias/script.js',

  './controle-de-cadastros/index.html',
  './controle-de-cadastros/style.css',
  './controle-de-cadastros/script.js',

  './controle-de-entrada-saida/index.html',
  './controle-de-entrada-saida/style.css',
  './controle-de-entrada-saida/script.js',

  './controle-de-autorizacoes/index.html',
  './controle-de-autorizacoes/style.css',
  './controle-de-autorizacoes/script.js',

  './configuracoes/index.html',
  './configuracoes/style.css',
  './configuracoes/script.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: 'reload' })))
      )
  );
  // Sem skipWaiting: a nova versão fica aguardando o usuário clicar em
  // "Atualizar agora" no banner exibido pelo js/pwa.js.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

async function matchNavigation(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;

  const url = new URL(request.url);
  const indexKey = url.pathname.replace(/\/$/, '') + '/index.html';
  const index = await caches.match(indexKey, { ignoreSearch: true });
  if (index) return index;

  return caches.match(new URL('index.html', self.location.href).href);
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => matchNavigation(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (data === 'SKIP_WAITING' || (data && data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});
