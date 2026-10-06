const CACHE_NAME = 'powerwatch-v21';
const STATIC_ASSETS = [
  '/',
  '/community',
  '/community.html',
  '/download',
  '/install',
  '/download.html',
  '/style.css',
  '/style.css?v=21',
  '/app/portal-polish.css?v=1',
  '/app/core.js',
  '/app/core.js?v=19',
  '/app/community.js',
  '/app/community.js?v=20',
  '/app/main.js',
  '/app/main.js?v=20',
  '/assets/powerwatch-logo.svg',
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
  // Let API and Admin requests go directly to network
  if (event.request.url.includes('/api/') || event.request.url.includes('/admin')) {
    return;
  }

  // Network-first strategy: fetch fresh content online, fallback to cache offline
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/community');
          }
        });
      })
  );
});
