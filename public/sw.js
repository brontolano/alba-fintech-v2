// PWA Service Worker - ALBA Finance v2
// Caches static assets for offline use

const CACHE_NAME = 'alba-finance-v1';
const ASSETS = [
  '/',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline.html'
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
          return null;
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch - cache-first strategy for static, network-first for API
self.addEventListener('fetch', (event) => {
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) return response;
          
          return fetch(event.request).then((fetchResponse) => {
            // Cache static assets
            if (fetchResponse.status === 200 && 
                fetchResponse.type === 'basic' &&
                !event.request.url.includes('/api/') &&
                !event.request.url.includes('/_next/data/')) {
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(event.request, fetchResponse.clone()));
            }
            return fetchResponse;
          }).catch(() => {
            // Offline fallback
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/offline.html');
            }
          });
        })
    );
  }
});
