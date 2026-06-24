import { create } from 'zustand';

type RestPhase = 'idle' | 'running' | 'alarm';

interface RestTimerState {
  phase: RestPhase;
  durationMinutes: number;
  remainingSeconds: number;
  // Actions
  start: (durationMinutes: number) => void;
  endEarly: () => void;
  dismissAlarm: () => void;
  tick: () => void;
}

let intervalId: ReturnType<typeof setInterval> | null = null;
let tickFn: (() => void) | null = null;

function clearTimer() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
}

export const useRestTimerStore = create<RestTimerState>((set, get) => ({
  phase: 'idle',
  durationMinutes: 10,
  remainingSeconds: 0,

  start: (durationMinutes) => {
    clearTimer();
    set({
      phase: 'running',
      durationMinutes,
      remainingSeconds: durationMinutes * 60,
    });
    // Start global interval
    tickFn = () => {
      const s = get();
      if (s.phase !== 'running') { clearTimer(); return; }
      const next = s.remainingSeconds - 1;
      if (next <= 0) {
        set({ remainingSeconds: 0, phase: 'alarm' });
        clearTimer();
      } else {
        set({ remainingSeconds: next });
      }
    };
    intervalId = setInterval(() => tickFn?.(), 1000);
  },

  endEarly: () => {
    clearTimer();
    set({ phase: 'idle', remainingSeconds: 0 });
  },

  dismissAlarm: () => {
    clearTimer();
    set({ phase: 'idle' });
  },

  tick: () => {},
}));
