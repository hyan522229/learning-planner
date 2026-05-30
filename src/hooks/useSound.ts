import { useCallback } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';

type SoundName = 'timer-start' | 'timer-end' | 'block-complete' | 'review-correct' | 'review-wrong' | 'achievement';

function beep(frequency: number, duration: number, volume: number = 0.12, type: OscillatorType = 'sine', delay: number = 0) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = type;
    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch { /* audio not available */ }
}

function playFallbackBeep(type: 'start' | 'end' | 'correct' | 'wrong') {
  if (type === 'start') {
    beep(660, 0.2, 0.1, 'sine');
  } else if (type === 'end') {
    // Three-beep sequence to be very noticeable
    beep(880, 0.3, 0.15, 'triangle', 0);
    beep(880, 0.3, 0.15, 'triangle', 0.4);
    beep(1100, 0.5, 0.15, 'triangle', 0.8);
  } else if (type === 'correct') {
    beep(523, 0.2, 0.1, 'sine');
    setTimeout(() => beep(659, 0.2, 0.1, 'sine'), 150);
  } else {
    beep(200, 0.3, 0.08, 'square');
  }
}

export function useSound() {
  const soundEnabled = useSettingsStore(s => s.settings?.soundEnabled ?? true);

  const play = useCallback((name: SoundName) => {
    if (!soundEnabled) return;
    const typeMap: Record<SoundName, 'start' | 'end' | 'correct' | 'wrong'> = {
      'timer-start': 'start',
      'timer-end': 'end',
      'block-complete': 'end',
      'review-correct': 'correct',
      'review-wrong': 'wrong',
      'achievement': 'end',
    };
    playFallbackBeep(typeMap[name]);
  }, [soundEnabled]);

  return { play };
}
