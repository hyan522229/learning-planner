import { useState, useEffect } from 'react';
import { useTimer } from '@/hooks/useTimer';
import { useTimerStore } from '@/stores/timerStore';
import { useUIStore } from '@/stores/uiStore';
import { TimerRing } from './TimerRing';
import { motion } from 'motion/react';
import { X, RotateCw } from 'lucide-react';

export function FocusOverlay() {
  const { phase, progress, timeStr } = useTimer();
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
  const totalMin = Math.floor(totalSeconds / 60);
  const totalSec = totalSeconds % 60;

  const ringSize = isMobile ? 200 : 320;
  const ringWidth = isMobile ? 10 : 16;

  return (
    <div
      className="fixed inset-0 z-50 bg-background flex items-center justify-center overflow-hidden"
      onClick={() => { if (isMobile) setFocusMode(false); }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-5 select-none"
        style={isMobile && landscape ? {
          transform: 'rotate(90deg)',
          width: '100vh',
          height: '100vw',
          justifyContent: 'center',
        } : {}}
      >
        {/* Ring + time */}
        <div className="relative">
          <TimerRing progress={progress} size={ringSize} strokeWidth={ringWidth} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <motion.div
              className="font-bold tabular-nums tracking-wider"
              style={{ fontSize: isMobile ? '2.5rem' : '4.5rem' }}
            >
              {timeStr}
            </motion.div>
            {blockName && (
              <div className="text-xs text-muted-foreground max-w-[160px] truncate">{blockName}</div>
            )}
          </div>
        </div>

        {/* Elapsed / Total */}
        <div className="text-sm text-muted-foreground space-x-2">
          <span>已过 {String(elapsedMin).padStart(2, '0')}:{String(elapsedSec).padStart(2, '0')}</span>
          <span>/</span>
          <span>{String(totalMin).padStart(2, '0')}:{String(totalSec).padStart(2, '0')}</span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          {isMobile && (
            <button
              onClick={(e) => { e.stopPropagation(); setLandscape(!landscape); }}
              className="p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
            >
              <RotateCw size={20} className="text-muted-foreground" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setFocusMode(false); }}
            className="p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
          >
            <X size={22} className="text-muted-foreground" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground/40">
          {isMobile ? '点屏幕退出' : 'Esc 退出'}
        </p>
      </motion.div>
    </div>
  );
}
