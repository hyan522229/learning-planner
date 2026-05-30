import { useTimer } from '@/hooks/useTimer';
import { TimerRing } from './TimerRing';
import { TimerControls } from './TimerControls';
import { useTimerStore } from '@/stores/timerStore';
import { useBlockStore } from '@/stores/blockStore';
import { useUIStore } from '@/stores/uiStore';
import { useSound } from '@/hooks/useSound';
import { useConfetti } from '@/hooks/useConfetti';
import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

export function TimerPanel() {
  const { phase, progress, timeStr, minutes, seconds, start, pause, resume, extend, shorten, complete, reset } = useTimer();
  const currentBlockId = useTimerStore(s => s.currentBlockId);
  const updateBlockStatus = useBlockStore(s => s.updateBlockStatus);
  const setFocusMode = useUIStore(s => s.setFocusMode);
  const { play } = useSound();
  const { fire } = useConfetti();
  const prevPhase = useRef(phase);

  useEffect(() => {
    if (prevPhase.current !== 'completed' && phase === 'completed') {
      play('block-complete');
      fire('medium');
      // Auto-complete block
      if (currentBlockId) {
        updateBlockStatus(currentBlockId, 'completed', undefined);
      }
    }
    if (prevPhase.current !== 'running' && phase === 'running') {
      play('timer-start');
    }
    prevPhase.current = phase;
  }, [phase, play, fire, currentBlockId, updateBlockStatus]);

  const handleStart = () => {
    if (currentBlockId) {
      start(currentBlockId, 45);
    }
  };

  const handleComplete = () => {
    complete();
    if (currentBlockId) {
      updateBlockStatus(currentBlockId, 'completed', undefined);
    }
  };

  const handleExtend = () => extend(5);
  const handleShorten = () => shorten(5);
  const handleFocus = () => setFocusMode(true);

  const isIdle = phase === 'idle';

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative">
        <TimerRing progress={progress} />
        {/* Time display in center of ring */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isIdle ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <div className="text-5xl font-bold text-muted-foreground/30">00:00</div>
              <div className="text-sm text-muted-foreground mt-2">选择学习块开始计时</div>
            </motion.div>
          ) : (
            <motion.div
              key={phase}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              <div className="text-6xl font-bold tabular-nums tracking-wide">
                {timeStr}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {phase === 'running' ? '进行中' : phase === 'paused' ? '已暂停' : '已完成'}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <TimerControls
        phase={phase}
        onStart={handleStart}
        onPause={pause}
        onResume={resume}
        onExtend={handleExtend}
        onShorten={handleShorten}
        onComplete={handleComplete}
        onReset={reset}
        onFocus={handleFocus}
      />
    </div>
  );
}
