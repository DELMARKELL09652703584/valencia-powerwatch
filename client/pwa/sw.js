const BUILD_ID = '__POWERWATCH_BUILD_ID__';
const COMMUNITY_CACHE_PREFIX = 'powerwatch-community-';
const CACHE_NAME = `${COMMUNITY_CACHE_PREFIX}${BUILD_ID}`;
const STATIC_ASSETS = [
  '/community',
  '/community.html',
  '/client/css/style.css',
  '/client/css/portal-polish.css',
  '/client/js/shared/core.js',
  '/client/js/community/community.js',
  '/client/js/shared/main.js',
  '/client/js/community/chatbot.js',
  '/client/js/community/pwa-update.js',
  '/assets/powerwatch-logo.svg',
  '/assets/powerwatch-icon-180.png',
  '/assets/powerwatch-icon-192.png',
  '/assets/powerwatch-icon-512.png',
  '/assets/powerwatch-icon-maskable-512.png',
  '/assets/valencia-city-panorama.jpg',
  '/manifest.json',
];

function isCacheableStaticAsset(pathname) {
  return pathname === '/client/css/style.css'
    || pathname === '/manifest.json'
    || [
      '/client/css/portal-polish.css',
      '/client/js/shared/core.js',
      '/client/js/community/community.js',
      '/client/js/shared/main.js',
      '/client/js/community/chatbot.js',
      '/client/js/community/pwa-update.js',
    ].includes(pathname)
    || (pathname.startsWith('/assets/') && /\.(?:jpe?g|png|svg|webp|woff2?)$/.test(pathname))
    || (pathname.startsWith('/vendor/leaflet/') && /\.(?:css|js|png)$/.test(pathname));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(STATIC_ASSETS);
    if (!self.registration.active) await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => name.startsWith(COMMUNITY_CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);
  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) return;

  const isCommunityNavigation = request.mode === 'navigate'
    && ['/', '/index.html', '/user', '/user.html', '/citizen', '/citizen.html', '/community', '/community.html'].includes(requestUrl.pathname);
  if (!isCommunityNavigation && !isCacheableStaticAsset(requestUrl.pathname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) return cachedResponse;
      if (isCommunityNavigation) {
        const appShell = await cache.match('/community');
        if (appShell) return appShell;
      }
      throw error;
    }
  })());
});
