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
if ('serviceWorker' in navigator) {
  const reloadOnUpdate = (reg: ServiceWorkerRegistration) => {
    if (reg.waiting) {
      reg.waiting.postMessage('skipWaiting');
      window.location.reload();
      return;
    }
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      if (!w) return;
      w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) {
          w.postMessage('skipWaiting');
          window.location.reload();
        }
      });
    });
  };

  navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').then(reg => {
    reloadOnUpdate(reg);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update();
    });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
