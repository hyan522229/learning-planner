import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { useTimerStore } from '@/stores/timerStore';

// ── Timer state persistence (survives mobile app kill) ──
const TIMER_KEY = 'lp-timer-state';

// Restore timer state on startup
const saved = sessionStorage.getItem(TIMER_KEY);
if (saved) {
  try {
    const { phase, targetEnd, currentBlockId, totalSeconds, remainingSeconds } = JSON.parse(saved);
    if (phase === 'running' && targetEnd) {
      const now = Date.now();
      if (targetEnd > now) {
        // Still running — restore with updated remaining
        useTimerStore.setState({
          phase: 'running',
          currentBlockId,
          totalSeconds,
          remainingSeconds: Math.ceil((targetEnd - now) / 1000),
          targetEnd,
          startedAt: now - ((totalSeconds - Math.ceil((targetEnd - now) / 1000)) * 1000),
          lastElapsedSeconds: 0,
        });
      } else {
        // Timer expired while away — mark completed
        useTimerStore.setState({
          phase: 'completed',
          currentBlockId,
          totalSeconds,
          remainingSeconds: 0,
          targetEnd: null,
          lastElapsedSeconds: totalSeconds,
        });
      }
    } else if (phase === 'paused') {
      useTimerStore.setState({
        phase: 'paused',
        currentBlockId,
        totalSeconds,
        remainingSeconds,
        targetEnd: null,
        startedAt: null,
        lastElapsedSeconds: 0,
      });
    }
  } catch {}
}

// Save timer state on every change and before unload
useTimerStore.subscribe((state) => {
  if (state.phase === 'running' || state.phase === 'paused') {
    sessionStorage.setItem(TIMER_KEY, JSON.stringify({
      phase: state.phase,
      targetEnd: state.targetEnd,
      currentBlockId: state.currentBlockId,
      totalSeconds: state.totalSeconds,
      remainingSeconds: state.remainingSeconds,
    }));
  } else {
    sessionStorage.removeItem(TIMER_KEY);
  }
});

window.addEventListener('beforeunload', () => {
  const s = useTimerStore.getState();
  if (s.phase === 'running' || s.phase === 'paused') {
    sessionStorage.setItem(TIMER_KEY, JSON.stringify({
      phase: s.phase,
      targetEnd: s.targetEnd,
      currentBlockId: s.currentBlockId,
      totalSeconds: s.totalSeconds,
      remainingSeconds: s.remainingSeconds,
    }));
  }
});

// ── Service worker ──
// 只做干净注册，不做任何强制刷新/循环检查。
// 更新与缓存由 cache-first SW 自管理：导航 network-first 拿最新版本，
// 静态资源 cache-first 秒开。移除 reload 逻辑避免移动端循环卡死。
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
