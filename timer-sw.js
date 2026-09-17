/* 学习规划器 - 后台通知 Service Worker（计时完成 + 待办提醒）
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
    title: data.title || '学习规划器',
    body: data.body || '有一项到了你设定的提醒时间。',
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

// 待办提醒：窗口已经开着时只聚焦不够 —— 用户看到的还是原来那一页
// （后台的 PWA 恰恰是最常见的情形），点提醒等于没反应。聚焦后再把它导航到待办页。
// navigate 不是所有客户端都有；没有或失败都不影响"窗口已聚焦"这个结果，
// 绝不能因为导航失败把用户留在没有窗口的状态。
function focusTodoClientAndNavigate(client, target) {
  return client.focus().then(function () {
    if (typeof client.navigate === 'function') {
      return Promise.resolve(client.navigate(target)).catch(function () {});
    }
  }).catch(function () {});
}

// 点击通知：先按 tag 决定落点，再找已打开的窗口。
// tag 前缀 `todo:` 必须与页面侧的 REMINDER_TAG_PREFIX（src/utils/reminder.ts）一致，
// 不一致的话待办提醒会被当成计时通知、落到计时页。
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var tag = event.notification.tag || '';
  var isTodo = tag.indexOf('todo:') === 0;
  var target = scopePath('') + (isTodo ? '#/todos' : '#/timer');
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].focus) {
          if (isTodo) return focusTodoClientAndNavigate(clientList[i], target);
          return clientList[i].focus().catch(function () {});
        }
      }
      return self.clients.openWindow(target).catch(function () {});
    })
  );
});

// PWA 可安装性（beforeinstallprompt）要求 SW 注册了 fetch 处理器。
// 这里保持严格网络透明：只注册监听器、绝不 respondWith / 绝不缓存，
// 行为与没有该监听器完全一致，因此不会复发旧版"缓存旧 JS 导致白屏"的问题。
self.addEventListener('fetch', function () {
  /* 网络透明：不拦截、不缓存任何请求 */
});
