const CACHE = 'pizzelato-v1';
const ASSETS = [
  '/Cardapio/',
  '/Cardapio/index.html',
  '/Cardapio/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Só cachear requests do próprio cardápio (não Firebase)
  if(!e.request.url.includes('firestore') && !e.request.url.includes('googleapis')){
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
    );
  }
});
