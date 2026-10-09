const STAFF_BUILD_ID = '__POWERWATCH_STAFF_BUILD_ID__';
const STAFF_CACHE = `powerwatch-field-${STAFF_BUILD_ID}`;
const STAFF_SHELL = [
  '/staff',
  '/staff-manifest.json',
  '/app/staff.css?v=6',
  '/app/staff.js?v=9',
  '/assets/powerwatch-logo.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STAFF_CACHE).then((cache) => cache.addAll(STAFF_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('powerwatch-field-') && key !== STAFF_CACHE)
      .map((key) => caches.delete(key)),
  )));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  if (event.request.method !== 'GET' || requestUrl.origin !== self.location.origin) return;
  if (requestUrl.pathname.startsWith('/api/') || requestUrl.pathname.startsWith('/uploads/')) return;

  if (event.request.mode === 'navigate' && requestUrl.pathname.startsWith('/staff')) {
    event.respondWith(fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(STAFF_CACHE).then((cache) => cache.put('/staff', copy));
      }
      return response;
    }).catch(() => caches.match('/staff')));
    return;
  }

  if (STAFF_SHELL.includes(`${requestUrl.pathname}${requestUrl.search}`) || STAFF_SHELL.includes(requestUrl.pathname)) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const staffClient = clients.find((client) => new URL(client.url).pathname.startsWith('/staff'));
    if (staffClient) return staffClient.focus();
    return self.clients.openWindow('/staff');
  }));
});
