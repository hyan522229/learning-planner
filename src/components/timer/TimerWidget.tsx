import { useEffect, useRef, useCallback } from 'react';
import { useTimerStore } from '@/stores/timerStore';

/**
 * Picture-in-Picture desktop timer widget.
 *
 * Shows block name, ring progress, time, and inline controls:
 * - Click time area → pause / resume
 * - +/- buttons → extend / shorten by 5 min
 * - Back arrow → navigate to /timer
 *
 * Uses GSAP for smooth ring animation. Falls back gracefully
 * without documentPictureInPicture.
 */

const PIP_W = 380;
const PIP_H = 80;

export function TimerWidget() {
  const pipRef = useRef<Window | null>(null);
  const readyRef = useRef(false);

  const sendToPip = useCallback(
    (payload: Record<string, unknown>) => {
      const win = pipRef.current;
      if (!win || win.closed) return;
      try { (win as any).__pipUpdate?.(payload); } catch { /* */ }
    },
    [],
  );

  useEffect(() => {
    const timerStore = useTimerStore;

    const unsub = timerStore.subscribe(async (state) => {
      const { phase, remainingSeconds, totalSeconds, currentBlockId } = state;

      if (phase === 'idle') {
        if (pipRef.current && !pipRef.current.closed) pipRef.current.close();
        pipRef.current = null;
        readyRef.current = false;
        return;
      }

      // Fetch block name
      let blockName = '';
      if (currentBlockId) {
        try {
          const block = await blockStore.getState().getBlock?.(currentBlockId);
          // Use dexie directly
          const { db } = await import('@/db');
          const b = await db.blocks.get(currentBlockId);
          if (b) blockName = b.name;
        } catch { /* */ }
      }

      if (!pipRef.current || pipRef.current.closed) {
        if (!window.documentPictureInPicture) return;
        readyRef.current = false;

        window.documentPictureInPicture
          .requestWindow({ width: PIP_W, height: PIP_H })
          .then((win) => {
            pipRef.current = win;
            writeShell(win);

            let attempts = 0;
            const poll = setInterval(() => {
              attempts++;
              try {
                if ((win as any).__pipReady) {
                  readyRef.current = true;
                  clearInterval(poll);
                  const s = timerStore.getState();
                  sendToPip({ phase: s.phase, remainingSeconds: s.remainingSeconds, totalSeconds: s.totalSeconds, blockName });
                } else if (attempts > 20 || win.closed) {
                  clearInterval(poll);
                  readyRef.current = true;
                  const s = timerStore.getState();
                  sendToPip({ phase: s.phase, remainingSeconds: s.remainingSeconds, totalSeconds: s.totalSeconds, blockName });
                }
              } catch { clearInterval(poll); }
            }, 100);

            // Listen for messages from PiP window
            const onMsg = (e: MessageEvent) => {
              if (e.source !== win) return;
              const { action, data } = e.data || {};
              const ts = timerStore.getState();
              if (action === 'pause') ts.pause();
              else if (action === 'resume') ts.resume();
              else if (action === 'extend') ts.extend(5);
              else if (action === 'shorten') ts.shorten(5);
              else if (action === 'reset') ts.reset();
            };
            window.addEventListener('message', onMsg);

            win.addEventListener('pagehide', () => {
              pipRef.current = null;
              readyRef.current = false;
              window.removeEventListener('message', onMsg);
            });
          })
          .catch(() => {});
        return;
      }

      sendToPip({ phase, remainingSeconds, totalSeconds, blockName });

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
  }, [sendToPip]);

  return null;
}

// ── PiP document ──

function writeShell(win: Window) {
  const C = String(2 * Math.PI * 16);

  win.document.write(`
    <!DOCTYPE html>
    <html><head><meta charset="utf-8">
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{
        background:#1c1c1e;color:#fff;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
        display:flex;align-items:center;height:100vh;user-select:none;overflow:hidden;
        -webkit-user-select:none;-webkit-app-region:drag;padding:0 14px;
      }
      .root{display:flex;align-items:center;gap:12px;width:100%}
      .ring-svg{width:36px;height:36px;transform:rotate(-90deg);flex-shrink:0;cursor:pointer}
      .ring-bg{fill:none;stroke:rgba(255,255,255,0.1);stroke-width:3}
      .ring-fg{fill:none;stroke:#f1f5f9;stroke-width:3;stroke-linecap:round;stroke-dasharray:${C};stroke-dashoffset:0}
      .center{flex:1;min-width:0;cursor:pointer}
      .name{font-size:11px;font-weight:500;color:rgba(255,255,255,0.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2}
      .time{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:0.03em;line-height:1.1}
      .btns{display:flex;align-items:center;gap:4px;flex-shrink:0}
      .btn{width:28px;height:28px;border-radius:6px;border:none;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.7);font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.15s;-webkit-app-region:no-drag}
      .btn:hover{background:rgba(255,255,255,0.15)}
      .btn-pause{width:32px;height:32px;border-radius:50%;font-size:14px}
    </style>
    </head>
    <body>
    <div class="root">
      <svg class="ring-svg" viewBox="0 0 40 40" id="ringArea">
        <circle class="ring-bg" cx="20" cy="20" r="16"/>
        <circle id="rf" class="ring-fg" cx="20" cy="20" r="16"/>
      </svg>
      <div class="center" id="centerArea">
        <div id="bn" class="name"></div>
        <div id="tn" class="time">00:00</div>
      </div>
      <div class="btns">
        <button class="btn" id="btnMinus" title="-5min">−</button>
        <button class="btn btn-pause" id="btnPause" title="暂停/继续">❚❚</button>
        <button class="btn" id="btnPlus" title="+5min">+</button>
        <button class="btn" id="btnBack" title="返回规划器">↩</button>
      </div>
    </div>
    <script>
      var CIRC = ${C};
      var rf = document.getElementById('rf');
      var tn = document.getElementById('tn');
      var bn = document.getElementById('bn');
      var gsapReady = false;
      var prevPhase = '';
      var prevSecs = -1;
      var currentPhase = 'running';

      function post(action, data) { if(window.opener) window.opener.postMessage({action:action,data:data},'*'); }

      document.getElementById('btnPause').onclick = function() { post(currentPhase==='running'?'pause':'resume'); };
      document.getElementById('btnPlus').onclick = function() { post('extend'); };
      document.getElementById('btnMinus').onclick = function() { post('shorten'); };
      document.getElementById('btnBack').onclick = function() { if(window.opener) window.opener.focus(); };
      document.getElementById('ringArea').onclick = function() { post(currentPhase==='running'?'pause':'resume'); };
      document.getElementById('centerArea').onclick = function() { post(currentPhase==='running'?'pause':'resume'); };

      function updateDOM(remaining, total, phase, blockName) {
        currentPhase = phase;
        var pct = total > 0 ? remaining / total : 0;
        rf.style.strokeDashoffset = CIRC * (1 - pct);
        var m = Math.floor(remaining / 60), s = remaining % 60;
        tn.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
        if (blockName) bn.textContent = blockName;
        if (phase === 'running') { rf.style.stroke = '#a5b4fc'; }
        else if (phase === 'paused') { rf.style.stroke = '#fbbf24'; }
        else if (phase === 'completed') { rf.style.stroke = '#4ade80'; }
        else { rf.style.stroke = '#f1f5f9'; }
      }
      function updateGSAP(remaining, total, phase, blockName) {
        currentPhase = phase;
        var pct = total > 0 ? remaining / total : 0;
        gsap.to(rf, { strokeDashoffset: CIRC * (1 - pct), duration: 0.4, ease: 'power2.out' });
        if (remaining !== prevSecs) {
          prevSecs = remaining;
          var m = Math.floor(remaining / 60), s = remaining % 60;
          tn.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
        }
        if (blockName) bn.textContent = blockName;
        if (phase !== prevPhase) {
          prevPhase = phase;
          var color;
          if (phase === 'running') color = '#a5b4fc';
          else if (phase === 'paused') color = '#fbbf24';
          else if (phase === 'completed') color = '#4ade80';
          else color = '#f1f5f9';
          gsap.to(rf, { stroke: color, duration: 0.3 });
        }
      }
      window.__pipUpdate = function(payload) {
        var p = payload || {};
        if (gsapReady) updateGSAP(p.remainingSeconds||0, p.totalSeconds||0, p.phase||'', p.blockName||'');
        else updateDOM(p.remainingSeconds||0, p.totalSeconds||0, p.phase||'', p.blockName||'');
      };
      window.__pipReady = false;
      function onLoad() { gsapReady = true; window.__pipReady = true; gsap.set(rf, { strokeDashoffset: 0 }); }
      if (typeof gsap !== 'undefined') onLoad();
      else { var c=0, t=setInterval(function(){c++;if(typeof gsap!=='undefined'){clearInterval(t);onLoad();}else if(c>30){clearInterval(t);window.__pipReady=true;}},100); }
    </script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.15.0/gsap.min.js" onload="onLoad()"></script>
    </body></html>
  `);
  win.document.close();
}
