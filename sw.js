// Network-first service worker — always tries to get latest version
const CACHE_NAME = 'lp-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
  // Clear old caches
  caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
});

self.addEventListener('fetch', (e) => {
  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Cache successful responses for offline fallback
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return response;
      })
      .catch(() => {
        // Offline: return cached version if available
        return caches.match(e.request).then(cached => {
          return cached || new Response('离线状态', { status: 503 });
        });
      })
  );
});
