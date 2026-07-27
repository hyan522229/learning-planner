// Force immediate activation, never use stale SW
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
  // Force all clients to reload when SW updates
  e.waitUntil(self.clients.matchAll().then(clients => {
    clients.forEach(client => client.navigate(client.url));
  }));
});

// Network-first with no-cache header to always get fresh content
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).catch(() => caches.match(e.request))
  );
});

// Listen for update check from page
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
  if (e.data === 'checkUpdate') self.clients.matchAll().then(clients => {
    clients.forEach(client => client.postMessage({ type: 'update' }));
  });
});
