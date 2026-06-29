import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Register service worker with auto-update
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
    // Also check on visibility change (PWA standalone wakes up)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update();
    });
  });

  // Check for controller change (new SW took over)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
