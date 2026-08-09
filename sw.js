// ── Cache-first service worker ──
// 解决移动端弱网打开卡住的问题：
// 已缓存的静态资源直接从本地读取（秒开，不走网络）；
// 导航请求（index.html）网络优先，保证拿到最新版本。
// 注意：所有用户数据都在 IndexedDB，本 SW 的缓存操作不影响任何数据。
const CACHE_NAME = 'learning-planner-v3';

// 安装：预缓存 app shell，并立即接管（跳过等待）
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(['./', './index.html']))
      .catch(() => {})
  );
});

// 激活：清理旧版本缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// 缓存策略
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  // 只处理同源请求，不干预跨域
  if (url.origin !== self.location.origin) return;

  // 导航请求（HTML）：网络优先，失败回退缓存 —— 保证拿到最新版本
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 静态资源：缓存优先 —— 已缓存直接返回，不再走网络（弱网不卡）
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
