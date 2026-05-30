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
};

export const useTimerStore = create<TimerState & TimerActions>((set) => ({
  ...initialState,

  start: (blockId, durationMinutes) => set({
    phase: 'running',
    currentBlockId: blockId,
    totalSeconds: durationMinutes * 60,
    remainingSeconds: durationMinutes * 60,
    startedAt: Date.now(),
  }),

  pause: () => set({ phase: 'paused' }),

  resume: () => set({ phase: 'running', startedAt: Date.now() }),

  tick: () => set(s => {
    if (s.phase !== 'running') return {};
    const newRemaining = Math.max(0, s.remainingSeconds - 1);
    if (newRemaining <= 0) {
      return { remainingSeconds: 0, phase: 'completed' as const };
    }
    return { remainingSeconds: newRemaining };
  }),

  extend: (minutes) => set(s => ({
    remainingSeconds: s.remainingSeconds + minutes * 60,
    totalSeconds: s.totalSeconds + minutes * 60,
  })),

  shorten: (minutes) => set(s => ({
    remainingSeconds: Math.max(60, s.remainingSeconds - minutes * 60),
    totalSeconds: Math.max(60, s.totalSeconds - minutes * 60),
  })),

  complete: () => set({ phase: 'completed', remainingSeconds: 0 }),

  reset: () => set(initialState),
}));
