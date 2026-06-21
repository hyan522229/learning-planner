import { useState, useRef, useEffect, useCallback } from 'react';

type RestPhase = 'idle' | 'running' | 'alarm';

interface RestTimerState {
  phase: RestPhase;
  durationMinutes: number;
  remainingSeconds: number;
}

/**
 * Standalone rest-timer state machine.
 *
 * - User picks a duration, presses start → 'running'.
 * - Countdown ticks every second.
 * - When it reaches zero → 'alarm' (audio handled by caller).
 * - User can end early or dismiss alarm → 'idle'.
 */
export function useRestTimer() {
  const [state, setState] = useState<RestTimerState>({
    phase: 'idle',
    durationMinutes: 10,
    remainingSeconds: 0,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearIntervalTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  // ── tick every second while running ──
  useEffect(() => {
    if (state.phase === 'running') {
      intervalRef.current = setInterval(() => {
        setState(prev => {
          const next = prev.remainingSeconds - 1;
          if (next <= 0) {
            return { ...prev, remainingSeconds: 0, phase: 'alarm' as const };
          }
          return { ...prev, remainingSeconds: next };
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [state.phase]);

  // ── actions ──
  const start = useCallback((durationMinutes: number) => {
    clearIntervalTimer();
    setState({
      phase: 'running',
      durationMinutes,
      remainingSeconds: durationMinutes * 60,
    });
  }, [clearIntervalTimer]);

  const endEarly = useCallback(() => {
    clearIntervalTimer();
    setState(prev => ({ ...prev, phase: 'idle' as const, remainingSeconds: 0 }));
  }, [clearIntervalTimer]);

  const dismissAlarm = useCallback(() => {
    clearIntervalTimer();
    setState(prev => ({ ...prev, phase: 'idle' as const }));
  }, [clearIntervalTimer]);

  useEffect(() => () => clearIntervalTimer(), [clearIntervalTimer]);

  return {
    ...state,
    start,
    endEarly,
    dismissAlarm,
  };
}
