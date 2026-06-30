import { useState, useEffect, useCallback } from 'react';
import { useTimer } from '@/hooks/useTimer';
import { useTimerStore } from '@/stores/timerStore';
import { useUIStore } from '@/stores/uiStore';
import { TimerRing } from './TimerRing';
import { motion } from 'motion/react';
import { X, RotateCw, Plus, Minus } from 'lucide-react';

export function FocusOverlay() {
  const { phase, timeStr, extend, shorten } = useTimer();
  const totalSeconds = useTimerStore(s => s.totalSeconds);
  const remainingSeconds = useTimerStore(s => s.remainingSeconds);
  const currentBlockId = useTimerStore(s => s.currentBlockId);
  const setFocusMode = useUIStore(s => s.setFocusMode);
  const [landscape, setLandscape] = useState(true);
  const [blockName, setBlockName] = useState('');
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  useEffect(() => {
    if (currentBlockId) {
      import('@/db').then(({ db }) => {
        db.blocks.get(currentBlockId).then(b => {
          if (b) setBlockName(b.name);
        });
      });
    }
  }, [currentBlockId]);

  // Mobile: enter fullscreen + lock landscape when entering focus mode
  useEffect(() => {
    if (isMobile) {
      const goFull = async () => {
        try {
          if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
          }
          // Try locking orientation (Android Chrome)
          try { await (screen.orientation as any)?.lock?.('landscape'); } catch {}
        } catch {}
      };
      goFull();
    }
    return () => {
      if (isMobile && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      try { (screen.orientation as any)?.unlock?.(); } catch {}
    };
  }, [isMobile]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleClose = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    try { (screen.orientation as any)?.unlock?.(); } catch {}
    setFocusMode(false);
  }, [setFocusMode]);

  const handleToggleOrientation = useCallback(async () => {
    setLandscape(l => !l);
    if (!landscape) {
      // Going landscape: try real orientation lock
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
        try { await (screen.orientation as any)?.lock?.('landscape'); } catch {}
      } catch {}
    } else {
      // Going portrait: unlock
      try { (screen.orientation as any)?.unlock?.(); } catch {}
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
  }, [landscape]);

  const elapsed = totalSeconds - remainingSeconds;
  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const ringSize = isMobile && landscape ? 220 : 320;
  const ringStroke = isMobile && landscape ? 10 : 16;

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center overflow-hidden">
      {/* Top row buttons */}
      <div className="absolute top-3 left-3 right-3 z-10 flex justify-between pointer-events-none">
        <div className="flex gap-2 pointer-events-auto">
          <button onClick={handleToggleOrientation} className="p-2.5 rounded-full bg-muted/60 active:scale-90 transition-all">
            <RotateCw size={20} />
          </button>
        </div>
        <button onClick={handleClose} className="p-2.5 rounded-full bg-muted/60 active:scale-90 transition-all pointer-events-auto">
          <X size={22} />
        </button>
      </div>

      {/* Time adjustment — bottom */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex justify-center pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button onClick={() => shorten(5)} className="p-2.5 rounded-full bg-muted/50 active:scale-90 transition-all">
            <Minus size={18} />
          </button>
          <span className="text-xs text-muted-foreground w-10 text-center">5min</span>
          <button onClick={() => extend(5)} className="p-2.5 rounded-full bg-muted/50 active:scale-90 transition-all">
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Main content — rotated on mobile landscape */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center justify-center select-none"
        style={isMobile && landscape ? {
          transform: 'rotate(90deg)',
        } : {}}
      >
        {/* Ring + time — all inside */}
        <div className="relative">
          <TimerRing progress={progress} size={ringSize} strokeWidth={ringStroke} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <div
              className="font-bold tabular-nums tracking-wide"
              style={{ fontSize: isMobile && landscape ? '2.5rem' : '4.5rem' }}
            >
              {timeStr}
            </div>
            {blockName && (
              <div className="text-xs text-muted-foreground max-w-[160px] truncate px-2">{blockName}</div>
            )}
            <div className="text-xs text-muted-foreground/50 mt-0.5">
              {phase === 'running' ? '专注中' : '已暂停'} · {String(elapsedMin).padStart(2, '0')}:{String(elapsedSec).padStart(2, '0')}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
