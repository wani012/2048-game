const CACHE_NAME = '1024-v16';
const ASSETS = ['./', 'index.html', 'style.css', 'theme-engine.js', 'underwater-reef.jpg', 'space-cosmos.jpg', 'arctic-glacier.jpg', 'manifest.json', 'icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
