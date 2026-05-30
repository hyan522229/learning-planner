import { useEffect } from 'react';
import { useTimer } from '@/hooks/useTimer';
import { useUIStore } from '@/stores/uiStore';
import { TimerRing } from './TimerRing';
import { motion } from 'motion/react';

export function FocusOverlay() {
  const { phase, progress, timeStr } = useTimer();
  const setFocusMode = useUIStore(s => s.setFocusMode);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setFocusMode]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center flex flex-col items-center gap-8"
      >
        <div className="relative">
          <TimerRing progress={progress} size={320} strokeWidth={16} />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="text-7xl font-bold tabular-nums tracking-wider"
              key={Math.floor(timeStr.length > 0 ? 1 : 0)}
            >
              {timeStr}
            </motion.div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {phase === 'running' ? '专注中...' : phase === 'paused' ? '已暂停' : ''}
          </p>
          <button
            onClick={() => setFocusMode(false)}
            className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            按 Esc 退出专注模式
          </button>
        </div>
      </motion.div>
    </div>
  );
}
