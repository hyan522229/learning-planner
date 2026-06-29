// Strict network-first — always fetches latest, never caches HTML
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).then(r => r).catch(() => caches.match(e.request))
  );
});

// Notify clients when new SW is available
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
