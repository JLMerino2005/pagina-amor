// sw.js
const CACHE = 'para-ti-v5'; // ⬅️ súbelo cuando cambies archivos

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png'
  // agrega aquí imágenes locales si quieres que estén offline
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => k !== CACHE && caches.delete(k)));
    if (self.registration.navigationPreload) {
      await self.registration.navigationPreload.enable();
    }
    await self.clients.claim();
  })());
});

// Estrategias
async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  cache.put(req, res.clone());
  return res;
}
async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  const net = fetch(req).then((res) => { cache.put(req, res.clone()); return res; })
    .catch(() => cached || caches.match('./'));
  return cached || net;
}
async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || (await caches.match('./'));
  }
}

// Ruteo
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Navegaciones (HTML): network-first
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirst(req));
    return;
  }

  if (!sameOrigin) return; // sólo cache same-origin

  // Imágenes locales
  if (url.pathname.includes('/img/')) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Resto de estáticos same-origin
  event.respondWith(staleWhileRevalidate(req));
});

// Mensaje para activar inmediatamente
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
