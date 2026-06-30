import { useState, useEffect } from 'react';
import { useTimer } from '@/hooks/useTimer';
import { useTimerStore } from '@/stores/timerStore';
import { useUIStore } from '@/stores/uiStore';
import { TimerRing } from './TimerRing';
import { motion } from 'motion/react';
import { X, RotateCw } from 'lucide-react';

export function FocusOverlay() {
  const { phase, timeStr } = useTimer();
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

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFocusMode(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setFocusMode]);

  const elapsed = totalSeconds - remainingSeconds;
  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;

  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center overflow-hidden">
      {/* Close button — top right, always clickable */}
      <button
        onClick={() => setFocusMode(false)}
        className="absolute top-4 right-4 z-10 p-3 rounded-full bg-muted/60 hover:bg-muted active:scale-90 transition-all"
      >
        <X size={24} />
      </button>

      {/* Rotate button — top left on mobile */}
      {isMobile && (
        <button
          onClick={() => setLandscape(l => !l)}
          className="absolute top-4 left-4 z-10 p-3 rounded-full bg-muted/60 hover:bg-muted active:scale-90 transition-all"
        >
          <RotateCw size={22} />
        </button>
      )}

      {/* Main content */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center justify-center gap-4 select-none"
        style={isMobile && landscape ? {
          transform: 'rotate(90deg)',
          width: '100vh',
          height: '100vw',
          maxWidth: '100vh',
          maxHeight: '100vw',
        } : { width: '100%', maxWidth: '400px' }}
      >
        {/* Ring + time */}
        <div className="relative">
          <TimerRing progress={progress} size={isMobile && landscape ? 280 : 320} strokeWidth={isMobile && landscape ? 14 : 16} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <motion.div className="text-5xl sm:text-7xl font-bold tabular-nums tracking-wide">
              {timeStr}
            </motion.div>
            {blockName && (
              <div className="text-xs text-muted-foreground max-w-[180px] truncate px-2">{blockName}</div>
            )}
          </div>
        </div>

        {/* Elapsed time */}
        <div className="text-sm text-muted-foreground">
          已过 {String(elapsedMin).padStart(2, '0')}:{String(elapsedSec).padStart(2, '0')}
        </div>

        {/* Status */}
        <p className="text-xs text-muted-foreground/60">
          {phase === 'running' ? '专注中' : phase === 'paused' ? '已暂停' : ''}
        </p>
      </motion.div>
    </div>
  );
}
