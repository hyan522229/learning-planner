import { create } from 'zustand';
import type { TimerState } from '@/types';

interface TimerActions {
  start: (blockId: string, durationMinutes: number) => void;
  pause: () => void;
  resume: () => void;
  tick: () => void;
  extend: (minutes: number) => void;
  shorten: (minutes: number) => void;
  complete: () => void;
  reset: () => void;
}

const initialState: TimerState = {
  phase: 'idle',
  currentBlockId: null,
  totalSeconds: 0,
  remainingSeconds: 0,
  startedAt: null,
  targetEnd: null,
  lastElapsedSeconds: 0,
};

// Global interval — survives component unmount
let tickInterval: ReturnType<typeof setInterval> | null = null;

function startTicking() {
  stopTicking();
  tickInterval = setInterval(() => {
    useTimerStore.getState().tick();
    const s = useTimerStore.getState();
    if (s.phase !== 'running') stopTicking();
  }, 250);
}

function stopTicking() {
  if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
}

export const useTimerStore = create<TimerState & TimerActions>((set) => ({
  ...initialState,

  start: (blockId, durationMinutes) => {
    stopTicking();
    set({
      phase: 'running',
      currentBlockId: blockId,
      totalSeconds: durationMinutes * 60,
      remainingSeconds: durationMinutes * 60,
      startedAt: Date.now(),
      targetEnd: Date.now() + durationMinutes * 60000,
    });
    startTicking();
  },

  pause: () => {
    stopTicking();
    set({ phase: 'paused', targetEnd: null });
  },

  resume: () => {
    stopTicking();
    set(s => ({
      phase: 'running',
      startedAt: Date.now(),
      targetEnd: Date.now() + s.remainingSeconds * 1000,
    }));
    startTicking();
  },

  tick: () => set(s => {
    if (s.phase !== 'running' || !s.targetEnd) return {};
    const remaining = Math.max(0, Math.ceil((s.targetEnd - Date.now()) / 1000));
    if (remaining <= 0) {
      stopTicking();
      return { remainingSeconds: 0, targetEnd: null, phase: 'completed' as const, lastElapsedSeconds: s.totalSeconds };
    }
    return { remainingSeconds: remaining };
  }),

  extend: (minutes) => set(s => {
    const added = minutes * 60;
    return {
      remainingSeconds: s.remainingSeconds + added,
      totalSeconds: s.totalSeconds + added,
      targetEnd: s.targetEnd ? s.targetEnd + minutes * 60000 : null,
    };
  }),

  shorten: (minutes) => set(s => {
    const removed = minutes * 60;
    const newRemaining = Math.max(60, s.remainingSeconds - removed);
    const actualRemoved = s.remainingSeconds - newRemaining;
    return {
      remainingSeconds: newRemaining,
      totalSeconds: Math.max(60, s.totalSeconds - removed),
      targetEnd: s.targetEnd ? s.targetEnd - actualRemoved * 1000 : null,
    };
  }),

  complete: () => {
    stopTicking();
    set(s => ({
      phase: 'completed',
      remainingSeconds: 0,
      targetEnd: null,
      lastElapsedSeconds: s.totalSeconds - s.remainingSeconds,
    }));
  },

  reset: () => {
    stopTicking();
    set(initialState);
  },
}));

// Auto-manage interval on external phase changes (e.g. sessionStorage restore)
useTimerStore.subscribe((s, prev) => {
  if (s.phase === 'running' && prev?.phase !== 'running') startTicking();
  if (s.phase !== 'running' && prev?.phase === 'running') stopTicking();
});
