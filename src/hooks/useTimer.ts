import { useEffect, useRef } from 'react';
import { useTimerStore } from '@/stores/timerStore';

export function useTimer() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<any>(null);
  const { phase, remainingSeconds, totalSeconds, currentBlockId, start, pause, resume, tick, extend, shorten, complete, reset } = useTimerStore();

  useEffect(() => {
    if (phase === 'running') {
      intervalRef.current = setInterval(() => {
        tick();
      }, 250);
      // Prevent screen lock while timer is running
      if ('wakeLock' in navigator) {
        (navigator as any).wakeLock.request('screen').then((sentinel: any) => {
          wakeLockRef.current = sentinel;
          sentinel.addEventListener('release', () => { wakeLockRef.current = null; });
        }).catch(() => {});
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [phase, tick]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // handled by FocusOverlay
      }
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        if (phase === 'running') pause();
        else if (phase === 'paused') resume();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, pause, resume]);

  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return {
    phase, remainingSeconds, totalSeconds, currentBlockId, progress, timeStr, minutes, seconds,
    start, pause, resume, extend, shorten, complete, reset,
  };
}
