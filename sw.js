const CACHE_NAME = 'powerwatch-v22';
const STATIC_ASSETS = [
  '/community',
  '/community.html',
  '/style.css',
  '/style.css?v=22',
  '/app/portal-polish.css?v=1',
  '/app/core.js',
  '/app/core.js?v=19',
  '/app/community.js',
  '/app/community.js?v=21',
  '/app/main.js?v=21',
  '/assets/powerwatch-logo.svg',
  '/assets/powerwatch-icon-180.png',
  '/assets/powerwatch-icon-192.png',
  '/assets/powerwatch-icon-512.png',
  '/assets/powerwatch-icon-maskable-512.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA cache pre-fetch warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purging old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  if (event.request.method !== 'GET' || requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, clone))
            .catch((error) => console.warn('PWA cache update failed:', error));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/community');
          }
          return Response.error();
        });
      })
  );
});
