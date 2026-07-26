// Service Worker do LUELE WMS
// Objectivo: permitir instalar a app no telemóvel/computador e abrir a "casca" (HTML +
// bibliotecas) mesmo sem ligação à internet. NÃO substitui a sincronização em tempo real —
// isso continua a precisar de rede — mas evita que a app fique completamente inutilizável
// só porque a ligação caiu por um bocado. Os dados em si (stock, histórico) ficam
// disponíveis offline separadamente, através da persistência offline do Firestore
// (activada no próprio index.html), não por este ficheiro.
//
// IMPORTANTE: sempre que este ficheiro ou os ficheiros da lista APP_SHELL mudarem de
// conteúdo de forma relevante, muda o número em CACHE_NAME (ex: 'luele-wms-v2') — caso
// contrário os dispositivos que já instalaram a app podem continuar presos numa versão
// antiga em cache.
const CACHE_NAME = 'luele-wms-v1';

const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Só se aplica cache "inteligente" a pedidos GET para estes três sítios: o próprio
// domínio da app (GitHub Pages) e as bibliotecas estáticas que carregamos de CDN. Tudo o
// resto (Firestore, Firebase Authentication, etc.) passa sempre directamente pela rede,
// sem qualquer interferência deste service worker — nunca deve ficar "preso" em cache.
const CDN_HOSTS = ['cdnjs.cloudflare.com'];
const FIREBASE_STATIC_HOST = 'www.gstatic.com';
const FIREBASE_STATIC_PATH_PREFIX = '/firebasejs/';

function isCacheableRequest(url) {
  if (url.origin === self.location.origin) return true;
  if (CDN_HOSTS.indexOf(url.hostname) >= 0) return true;
  if (url.hostname === FIREBASE_STATIC_HOST && url.pathname.indexOf(FIREBASE_STATIC_PATH_PREFIX) >= 0) return true;
  return false;
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(
        APP_SHELL.map(function (url) {
          return cache.add(url).catch(function (e) {
            console.warn('[SW] Falhou ao pré-cachear', url, e);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) { return n !== CACHE_NAME; }).map(function (n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return; // nunca intercepta escritas

  var url = new URL(req.url);
  if (!isCacheableRequest(url)) return; // deixa Firestore/Auth/etc. seguir normalmente

  // O HTML principal da app: tenta sempre a rede primeiro, para nunca mostrar uma versão
  // desactualizada enquanto há ligação — só recorre à cópia em cache se estiver offline.
  var isAppHtml = req.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname === '/' || url.pathname.endsWith('/armazens/');
  if (isAppHtml) {
    event.respondWith(
      fetch(req)
        .then(function (res) {
          var resClone = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, resClone); });
          return res;
        })
        .catch(function () {
          return caches.match(req).then(function (cached) { return cached || caches.match('./index.html'); });
        })
    );
    return;
  }

  // Bibliotecas estáticas (CDN, Firebase SDK): raramente mudam para a mesma versão, por
  // isso usa a cópia em cache primeiro (mais rápido) e só vai à rede se ainda não a tiver.
  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req)
        .then(function (res) {
          if (res && res.status === 200) {
            var resClone = res.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put(req, resClone); });
          }
          return res;
        })
        .catch(function () {
          return new Response('', { status: 503, statusText: 'Offline' });
        });
    })
  );
});
