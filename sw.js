// ── Service Worker 已弃用 ──
// 本文件只做一次自毁清理：清空缓存并注销自身。
// 应用不再注册 SW；历史残留的 SW 更新到本版本后会自动清除。
// 所有用户数据在 IndexedDB，与缓存无关，不受影响。
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    await self.registration.unregister();
    await self.clients.claim();
  })());
});

// 不再拦截任何网络请求
self.addEventListener('fetch', () => {});
