// PWA Service Worker - ALBA Finance v2
// Caches static assets for offline use

const CACHE_NAME = 'alba-finance-v1';
const ASSETS = [
  '/',
  '/logo-baru.png',
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

// ========================================
// FETCH HANDLER — Stale-while-revalidate + runtime caching
// ========================================

const API_CACHE_NAME = 'alba-api-cache-v1';
const API_CACHE_TTL = 60; // 1 menit untuk API agar tetap fresh
const ASSET_CACHE_TTL = 60 * 60 * 24; // 24 jam untuk static assets

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // 2. API routes — network-first (bypass cache), stale-while-revalidate as fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(apiNetworkFirst(event.request));
    return;
  }

  // 3. Static assets (JS, CSS, fonts, images) — stale-while-revalidate
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/logo') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(css|js|png|svg|ico|woff2?)$/)
  ) {
    event.respondWith(assetStaleWhileRevalidate(event.request));
    return;
  }

  // 4. Page navigations (HTML) — network-first, fallback to offline
  if (event.request.headers.get('accept')?.includes('text/html') || url.origin === self.location.origin) {
    event.respondWith(pageNetworkFirst(event.request));
    return;
  }

  // Default: try cache first, then network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((fetchResponse) => {
        if (fetchResponse.status === 200 && fetchResponse.type === 'basic') {
          const cloned = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          return fetchResponse;
        }
        return fetchResponse;
      }).catch(() => {
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/offline.html');
        }
      });
    })
  );
});

// --- Network First (API) ---
async function apiNetworkFirst(request) {
  try {
    const fresh = await fetch(request);
    if (fresh.status === 200) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, fresh.clone());
      // Set TTL via cache age — simple approach
      return fresh;
    }
    throw new Error(`API returned ${fresh.status}`);
  } catch (error) {
    const cache = await caches.open(API_CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
      // Stale SWR on API failure
      setTimeout(() => {
        fetch(request).then((resp) => {
          if (resp.status === 200) {
            cache.put(request, resp.clone());
          }
        }).catch(() => {});
      }, 0);
      return cached;
    }
    throw error;
  }
}

// --- Stale While Revalidate (Static Assets) ---
async function assetStaleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkFetch = fetch(request).then((response) => {
    if (response.status === 200 && response.type === 'basic') {
      cache.put(request, response.clone());
      return response;
    }
    return response;
  }).catch(() => {
    return cached || fetch(request);
  });

  // Return cached immediately if available; fetch in background for update
  if (cached) {
    networkFetch.catch(() => {});
    return cached;
  }

  return networkFetch;
}

// --- Network First (Pages), fallback to offline ---
async function pageNetworkFirst(request) {
  try {
    const fresh = await fetch(request);
    if (fresh.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, fresh.clone());
      return fresh;
    }
    throw new Error(`Page returned ${fresh.status}`);
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/offline.html');
    }
    throw error;
  }
}

// ========================================

// ========================================
// PUSH NOTIFICATIONS — Production Ready
// ========================================

self.addEventListener('push', (event) => {
  const data = event.data?.json();
  const title = data?.title || 'ALBA Finance';
  const options = {
    body: data?.body || 'Notifikasi baru tersedia',
    icon: '/logo-baru.png',
    badge: '/logo-baru.png',
    tag: data?.tag || `alba-${Date.now()}`,
    data: { url: data?.url || '/', ...data?.extra },
    actions: [
      { action: 'open', title: 'Buka' },
      { action: 'close', title: 'Tutup' },
    ],
    requireInteraction: data?.requireInteraction || false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});
