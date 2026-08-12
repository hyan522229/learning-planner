/* 学习规划器 - 计时完成通知 Service Worker
 *
 * 设计原则：
 * 1. 网络透明：绝不拦截任何请求、绝不缓存任何资源。
 *    这避免了旧版 SW 缓存旧 JS 导致移动端白屏的问题。
 * 2. 尽力而为的后台提醒：页面被系统杀后台后，页面 JS 停止运行，
 *    唯一还能唤起系统通知的就是 Service Worker。
 *    浏览器会在 SW 空闲约 30 秒后将其冻结，长计时无法保证准时唤醒，
 *    因此用"分片重触发"把唤醒间隔控制在 ~20 秒内，并且页面每次打开时
 *    都会重新下发计时任务（见 main.tsx），尽可能提高成功率。
 * 3. 页面本身存活时，计时完成由页面内的铃声负责，会通过 cancel 取消系统通知，
 *    避免双重提醒。
 */
'use strict';

var pending = {}; // tag -> { notifyAt, title, body }
var armTimer = null;
var CHUNK_MS = 20000; // 分片重触发间隔

function scopePath(name) {
  return self.registration.scope + name;
}

// 触发所有已到期的通知，并重新武装最近的计时任务
function fireAndRearm() {
  var now = Date.now();
  var next = Infinity;
  for (var tag in pending) {
    var t = pending[tag];
    if (!t) { delete pending[tag]; continue; }
    if (t.notifyAt <= now) {
      try {
        self.registration.showNotification(t.title, {
          body: t.body,
          tag: tag,
          renotify: true,
          requireInteraction: true,
          icon: scopePath('icon-192.png'),
        });
      } catch (e) { /* 通知不可用 */ }
      delete pending[tag];
    } else if (t.notifyAt < next) {
      next = t.notifyAt;
    }
  }

  if (armTimer) { clearTimeout(armTimer); armTimer = null; }
  if (next === Infinity) return; // 没有待触发任务
  var delay = Math.max(0, next - Date.now());
  if (delay > CHUNK_MS) delay = CHUNK_MS;
  armTimer = setTimeout(function () {
    armTimer = null;
    fireAndRearm();
  }, delay + 1000);
}

function handleSchedule(data) {
  if (!data || !data.tag || !data.notifyAt) return;
  pending[data.tag] = {
    notifyAt: data.notifyAt,
    title: data.title || '学习计时完成',
    body: data.body || '本次学习计时已结束，休息一下或继续下一项吧！',
  };
  fireAndRearm();
}

function handleCancel(data) {
  if (!data || !data.tag) return;
  delete pending[data.tag];
  fireAndRearm();
}

function handleCheck() {
  fireAndRearm();
}

self.addEventListener('install', function (event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    self.clients.claim().then(function () {
      handleCheck();
    })
  );
});

self.addEventListener('message', function (event) {
  var data = event.data || {};
  if (data.type === 'schedule') {
    event.waitUntil(Promise.resolve().then(function () { handleSchedule(data); }));
  } else if (data.type === 'cancel') {
    event.waitUntil(Promise.resolve().then(function () { handleCancel(data); }));
  } else if (data.type === 'check') {
    event.waitUntil(Promise.resolve().then(function () { handleCheck(); }));
  }
});

// 点击通知：聚焦已打开的窗口，否则打开计时页补全完成流程
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].focus) {
          return clientList[i].focus().catch(function () {});
        }
      }
      return self.clients.openWindow(scopePath('') + '#/timer').catch(function () {});
    })
  );
});

// PWA 可安装性（beforeinstallprompt）要求 SW 注册了 fetch 处理器。
// 这里保持严格网络透明：只注册监听器、绝不 respondWith / 绝不缓存，
// 行为与没有该监听器完全一致，因此不会复发旧版"缓存旧 JS 导致白屏"的问题。
self.addEventListener('fetch', function () {
  /* 网络透明：不拦截、不缓存任何请求 */
});
