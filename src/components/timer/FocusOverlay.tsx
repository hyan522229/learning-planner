import { useState, useEffect } from 'react';
import { useTimer } from '@/hooks/useTimer';
import { useTimerStore } from '@/stores/timerStore';
import { useBlockStore } from '@/stores/blockStore';
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

  return (
    <div
      className="fixed inset-0 z-50 bg-background flex items-center justify-center"
      onClick={() => { if (isMobile) setFocusMode(false); }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center flex flex-col items-center gap-6"
        style={isMobile && landscape ? { transform: 'rotate(90deg)' } : undefined}
      >
        {/* Ring + time */}
        <div className="relative">
          <TimerRing progress={progress} size={isMobile ? 240 : 320} strokeWidth={isMobile ? 12 : 16} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <motion.div className="text-5xl sm:text-7xl font-bold tabular-nums tracking-wider">
              {timeStr}
            </motion.div>
            {blockName && (
              <div className="text-xs text-muted-foreground max-w-[200px] truncate">{blockName}</div>
            )}
          </div>
        </div>

        {/* Time details */}
        <div className="text-sm text-muted-foreground space-x-3">
          <span>已过 {String(elapsedMin).padStart(2, '0')}:{String(elapsedSec).padStart(2, '0')}</span>
          <span>·</span>
          <span>总计 {String(totalMin).padStart(2, '0')}:{String(totalSec).padStart(2, '0')}</span>
        </div>

        {/* Status */}
        <p className="text-sm text-muted-foreground">
          {phase === 'running' ? '专注中...' : phase === 'paused' ? '已暂停' : ''}
        </p>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {isMobile && (
            <button
              onClick={(e) => { e.stopPropagation(); setLandscape(!landscape); }}
              className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
            >
              <RotateCw size={20} />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setFocusMode(false); }}
            className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            <X size={24} />
          </button>
        </div>

        <p className="text-xs text-muted-foreground/50">
          {isMobile ? '点击屏幕退出专注模式' : '按 Esc 退出专注模式'}
        </p>
      </motion.div>
    </div>
  );
}
