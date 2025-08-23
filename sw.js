const CACHE = 'para-ti-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest'
  // Si usas imágenes locales, agrégalas aquí para cachearlas
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE && caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e=>{
  const req = e.request;
  e.respondWith(
    caches.match(req).then(res=> res || fetch(req).then(r=>{
      const copy = r.clone();
      caches.open(CACHE).then(c=>c.put(req, copy));
      return r;
    }).catch(()=>caches.match('./')))
  );
});
