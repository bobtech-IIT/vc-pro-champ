const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `vcpro-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `vcpro-dynamic-${CACHE_VERSION}`;

const APP_SHELL = [
  '/',
  '/offline.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // HTML navigation strategy: Network-First with Offline fallback
  if (request.headers.get('Accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const resCopy = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, resCopy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match('/offline.html');
        })
    );
    return;
  }

  // Static Assets strategy: Cache-First
  if (url.pathname.match(/\.(css|js|png|jpg|svg|woff2|json)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const resCopy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, resCopy));
          return response;
        });
      })
    );
  }
});
