// Immediate activation — no stale SW
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
  // Post message to clients so they can decide to reload
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(clients => {
    clients.forEach(client => client.postMessage({ type: 'sw-updated' }));
  }));
});

// Listen for skip waiting
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

// Network-first — always try network
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).catch(() => caches.match(e.request))
  );
});
