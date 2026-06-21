import { useEffect, useRef, useCallback } from 'react';
import { useTimerStore } from '@/stores/timerStore';

/**
 * Picture-in-Picture desktop timer widget.
 *
 * Opens a floating always-on-top mini window when the timer is running.
 * Uses GSAP (loaded via CDN inside the PiP document) for smooth SVG ring
 * animation and state transitions.
 *
 * Silently falls back on browsers without documentPictureInPicture.
 */

const PIP_W = 300;
const PIP_H = 64;

export function TimerWidget() {
  const pipRef = useRef<Window | null>(null);
  const readyRef = useRef(false);

  const updatePip = useCallback(
    (phase: string, remainingSeconds: number, totalSeconds: number) => {
      const win = pipRef.current;
      if (!win || win.closed) return;
      // Call the update function exposed by the PiP document.
      // Falls back gracefully if GSAP hasn't loaded yet — the PiP
      // script uses direct DOM manipulation until GSAP is ready.
      try {
        (win as any).__pipUpdate?.(phase, remainingSeconds, totalSeconds);
      } catch {
        // PiP window may be in a transitional state
      }
    },
    [],
  );

  useEffect(() => {
    const unsub = useTimerStore.subscribe((state) => {
      const { phase, remainingSeconds, totalSeconds } = state;

      // ── Close on idle ──
      if (phase === 'idle') {
        if (pipRef.current && !pipRef.current.closed) pipRef.current.close();
        pipRef.current = null;
        readyRef.current = false;
        return;
      }

      // ── Open ──
      if (!pipRef.current || pipRef.current.closed) {
        if (!window.documentPictureInPicture) return;
        readyRef.current = false;

        window.documentPictureInPicture
          .requestWindow({ width: PIP_W, height: PIP_H })
          .then((win) => {
            pipRef.current = win;
            writeShell(win);

            // Poll for readiness (GSAP CDN loads async)
            let attempts = 0;
            const poll = setInterval(() => {
              attempts++;
              try {
                if ((win as any).__pipReady) {
                  readyRef.current = true;
                  clearInterval(poll);
                  // Push initial state
                  const s = useTimerStore.getState();
                  updatePip(s.phase, s.remainingSeconds, s.totalSeconds);
                } else if (attempts > 20 || win.closed) {
                  clearInterval(poll);
                  // Proceed without GSAP — basic updates still work
                  readyRef.current = true;
                  const s = useTimerStore.getState();
                  updatePip(s.phase, s.remainingSeconds, s.totalSeconds);
                }
              } catch {
                clearInterval(poll);
              }
            }, 100);

            win.addEventListener('pagehide', () => {
              pipRef.current = null;
              readyRef.current = false;
            });
          })
          .catch(() => {});
        return;
      }

      // ── Update ──
      updatePip(phase, remainingSeconds, totalSeconds);

      // ── Completed → brief celebration then close ──
      if (phase === 'completed') {
        setTimeout(() => {
          if (pipRef.current && !pipRef.current.closed) pipRef.current.close();
          pipRef.current = null;
          readyRef.current = false;
        }, 2000);
      }
    });

    return () => {
      unsub();
      if (pipRef.current && !pipRef.current.closed) pipRef.current.close();
    };
  }, [updatePip]);

  return null;
}

// ── PiP document (injected once per window) ──

function writeShell(win: Window) {
  const C = String(2 * Math.PI * 18); // circumference for r=18

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8">
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{
        background:#000;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
        display:flex;align-items:center;justify-content:center;
        height:100vh;user-select:none;overflow:hidden;
        -webkit-user-select:none;
        -webkit-app-region:drag;
      }
      .island{
        display:flex;align-items:center;gap:12px;
        background:#1c1c1e;
        border-radius:32px;
        padding:8px 18px 8px 14px;
        height:48px;
        transition:all 0.35s cubic-bezier(0.4,0,0.2,1);
      }
      .ring-svg{width:32px;height:32px;transform:rotate(-90deg);flex-shrink:0}
      .ring-bg{fill:none;stroke:rgba(255,255,255,0.1);stroke-width:3}
      .ring-fg{fill:none;stroke:#f1f5f9;stroke-width:3;stroke-linecap:round;stroke-dasharray:${C};stroke-dashoffset:0}
      .time-num{font-size:18px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:0.03em;color:#fff;line-height:1;white-space:nowrap}
      .status-txt{font-size:10px;font-weight:500;color:rgba(255,255,255,0.5);white-space:nowrap;margin-left:auto}
    </style>
    </head>
    <body>
    <div id="island" class="island">
      <svg class="ring-svg" viewBox="0 0 40 40">
        <circle class="ring-bg" cx="20" cy="20" r="18"/>
        <circle id="rf" class="ring-fg" cx="20" cy="20" r="18"/>
      </svg>
      <div id="tn" class="time-num">00:00</div>
      <div id="st" class="status-txt"></div>
    </div>
    <script>
      var CIRC = ${C};
      var rf = document.getElementById('rf');
      var tn = document.getElementById('tn');
      var st = document.getElementById('st');
      var island = document.getElementById('island');

      var prevPhase = '';
      var prevSecs = -1;
      var gsapReady = false;

      function updateDOM(remaining, total, phase) {
        var pct = total > 0 ? remaining / total : 0;
        rf.style.strokeDashoffset = CIRC * (1 - pct);
        var m = Math.floor(remaining / 60);
        var s = remaining % 60;
        tn.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');

        if (phase === 'running') { rf.style.stroke = '#a5b4fc'; st.textContent = '计时中'; }
        else if (phase === 'paused') { rf.style.stroke = '#fbbf24'; st.textContent = '已暂停'; }
        else if (phase === 'completed') { rf.style.stroke = '#4ade80'; st.textContent = '完成'; }
        else { rf.style.stroke = '#f1f5f9'; st.textContent = ''; }
      }

      function updateGSAP(remaining, total, phase) {
        var pct = total > 0 ? remaining / total : 0;
        gsap.to(rf, { strokeDashoffset: CIRC * (1 - pct), duration: 0.4, ease: 'power2.out' });

        if (remaining !== prevSecs) {
          prevSecs = remaining;
          var m = Math.floor(remaining / 60);
          var s = remaining % 60;
          tn.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
        }

        if (phase !== prevPhase) {
          prevPhase = phase;
          var color, label;
          if (phase === 'running') { color = '#a5b4fc'; label = '计时中'; }
          else if (phase === 'paused') { color = '#fbbf24'; label = '已暂停'; }
          else if (phase === 'completed') { color = '#4ade80'; label = '完成'; }
          else { color = '#f1f5f9'; label = ''; }

          gsap.to(rf, { stroke: color, duration: 0.35 });
          st.textContent = label;

          // Pulse the island background slightly on phase change
          gsap.fromTo(island, { background: '#2c2c2e' }, { background: '#1c1c1e', duration: 0.5 });
        }
      }

      window.__pipUpdate = function(phase, remainingSeconds, totalSeconds) {
        if (gsapReady) {
          updateGSAP(remainingSeconds, totalSeconds, phase);
        } else {
          updateDOM(remainingSeconds, totalSeconds, phase);
        }
      };

      window.__pipReady = false;

      function onGSAPLoad() {
        gsapReady = true;
        window.__pipReady = true;
        gsap.set(rf, { strokeDashoffset: 0 });
      }

      if (typeof gsap !== 'undefined') {
        onGSAPLoad();
      } else {
        var checks = 0;
        var gsapPoll = setInterval(function() {
          checks++;
          if (typeof gsap !== 'undefined') {
            clearInterval(gsapPoll);
            onGSAPLoad();
          } else if (checks > 30) {
            clearInterval(gsapPoll);
            window.__pipReady = true;
          }
        }, 100);
      }
    </script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.15.0/gsap.min.js" onload="onGSAPLoad()"></script>
    </body>
    </html>
  `);
  win.document.close();
}
