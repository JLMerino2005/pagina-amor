// sw.js
const CACHE = 'para-ti-v9'; // bump para invalidar caché anterior

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png'
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
    // Intenta usar navigationPreload si existe
    const preload = await eventPreloadResponse();
    const res = preload || await fetch(req);
    cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || (await caches.match('./'));
  }
}

// Obtiene la respuesta de navigationPreload si está disponible para esta navegación
async function eventPreloadResponse() {
  try {
    // @ts-ignore
    if (typeof navigationPreload !== 'undefined') {
      // SW global no expone directamente el preload por evento aquí,
      // así que devolvemos null y dejamos que networkFirst haga fetch normal.
      return null;
    }
    return null;
  } catch { return null; }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Navegaciones / HTML → networkFirst (con fallback cache)
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Solo caché de recursos del mismo origen
  if (!sameOrigin) return;

  // Imágenes de la galería → cacheFirst
  if (url.pathname.includes('/img/')) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Otros (CSS/JS/íconos locales) → staleWhileRevalidate
  event.respondWith(staleWhileRevalidate(req));
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
