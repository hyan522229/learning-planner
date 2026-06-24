// Minimal service worker — no aggressive caching.
// Always fetches from network so updates appear immediately.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Network-first: always try network, fallback to offline page
  e.respondWith(
    fetch(e.request).catch(() => {
      return new Response('离线状态，请连接网络后重试', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    })
  );
});
