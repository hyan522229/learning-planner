// Basic service worker for PWA installability
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request).catch(() => new Response('离线状态')));
});
