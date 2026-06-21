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

export const useTimerStore = create<TimerState & TimerActions>((set) => ({
  ...initialState,

  start: (blockId, durationMinutes) => set({
    phase: 'running',
    currentBlockId: blockId,
    totalSeconds: durationMinutes * 60,
    remainingSeconds: durationMinutes * 60,
    startedAt: Date.now(),
    targetEnd: Date.now() + durationMinutes * 60000,
  }),

  pause: () => set({ phase: 'paused', targetEnd: null }),

  resume: () => set(s => ({
    phase: 'running',
    startedAt: Date.now(),
    targetEnd: Date.now() + s.remainingSeconds * 1000,
  })),

  tick: () => set(s => {
    if (s.phase !== 'running' || !s.targetEnd) return {};
    const remaining = Math.max(0, Math.ceil((s.targetEnd - Date.now()) / 1000));
    if (remaining <= 0) {
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

  complete: () => set(s => ({
    phase: 'completed',
    remainingSeconds: 0,
    targetEnd: null,
    lastElapsedSeconds: s.totalSeconds - s.remainingSeconds,
  })),

  reset: () => set(initialState),
}));
