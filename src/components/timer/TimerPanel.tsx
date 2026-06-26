import { useTimer } from '@/hooks/useTimer';
import { TimerRing } from './TimerRing';
import { TimerControls } from './TimerControls';
import { useTimerStore } from '@/stores/timerStore';
import { useBlockStore } from '@/stores/blockStore';
import { useUIStore } from '@/stores/uiStore';
import { useSound } from '@/hooks/useSound';
import { useConfetti } from '@/hooks/useConfetti';
import { usePersonaStore } from '@/stores/personaStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { stopAudio, isAudioPlaying, playAudioFromBlob, playAudioFromPath } from '@/hooks/taskCompleteAudio';
import { db } from '@/db';
import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

/** Module-level ref so TimerPage can stop playing audio */
export const activeAudioCleanup = { current: null as (() => void) | null };

export function TimerPanel() {
  const { phase, progress, timeStr, minutes, seconds, start, pause, resume, extend, shorten, complete, reset } = useTimer();
  const currentBlockId = useTimerStore(s => s.currentBlockId);
  const lastElapsedSeconds = useTimerStore(s => s.lastElapsedSeconds);
  const updateBlockStatus = useBlockStore(s => s.updateBlockStatus);
  const setFocusMode = useUIStore(s => s.setFocusMode);
  const { play } = useSound();
  const { fire } = useConfetti();
  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const taskCompleteMusicEnabled = useSettingsStore(s => s.settings?.taskCompleteMusicEnabled ?? true);
  const prevPhase = useRef(phase);

  useEffect(() => {
    if (prevPhase.current !== 'completed' && phase === 'completed') {
      // Play music globally — module-level audio survives page navigation
      if (taskCompleteMusicEnabled) {
        (async () => {
          try {
            const files = await db.audioFiles.where({ personaId: activePersonaId ?? '' }).filter(f => f.category === 'task_complete').toArray();
            if (files.length > 0) {
              const picked = files[Math.floor(Math.random() * files.length)];
              playAudioFromBlob(picked.data);
            } else {
              play('block-complete');
            }
          } catch { play('block-complete'); }
        })();
        activeAudioCleanup.current = stopAudio;
      } else {
        play('block-complete');
      }
      fire('medium');
      if (currentBlockId) {
        const actualMins = Math.round(lastElapsedSeconds / 60);
        updateBlockStatus(currentBlockId, 'completed', actualMins || 1);
      }
    }
    if (prevPhase.current !== 'running' && phase === 'running') {
      play('timer-start');
    }
    prevPhase.current = phase;
  }, [phase, play, fire, currentBlockId, updateBlockStatus, lastElapsedSeconds, taskCompleteMusicEnabled, activePersonaId]);

  const handleUndo = () => {
    reset();
  };

  const handleStart = () => {
    if (currentBlockId) {
      start(currentBlockId, 45);
    }
  };

  const handleComplete = () => {
    // Read elapsed BEFORE complete() resets remainingSeconds
    const s = useTimerStore.getState();
    const actualMins = Math.round((s.totalSeconds - s.remainingSeconds) / 60);
    complete();
    if (currentBlockId) {
      updateBlockStatus(currentBlockId, 'completed', actualMins || 1);
    }
  };

  const handleExtend = () => extend(5);
  const handleShorten = () => shorten(5);
  const handleFocus = () => setFocusMode(true);

  const isIdle = phase === 'idle';

  return (
    <div className="relative flex flex-col items-center gap-8">
      {/* Undo — top-left back arrow */}
      {phase === 'running' && (
        <button
          onClick={handleUndo}
          className="absolute -left-2 -top-2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="撤销计时"
        >
          <ArrowLeft size={18} />
        </button>
      )}
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
