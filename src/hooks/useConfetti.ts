import { useCallback } from 'react';
import confetti from 'canvas-confetti';

type ConfettiPreset = 'light' | 'medium' | 'heavy';

export function useConfetti() {
  const fire = useCallback((preset: ConfettiPreset = 'light') => {
    const configs = {
      light: { particleCount: 30, spread: 60, colors: ['#3b82f6', '#22c55e', '#f59e0b'] },
      medium: { particleCount: 80, spread: 90, colors: ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'] },
      heavy: { particleCount: 200, spread: 120, colors: ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'] },
    };

    const config = configs[preset];

    // Fire from center
    confetti({
      ...config,
      origin: { x: 0.5, y: 0.5 },
      startVelocity: 25,
      decay: 0.9,
      ticks: 150,
    });

    // Fire a second burst slightly delayed
    if (preset !== 'light') {
      setTimeout(() => {
        confetti({
          ...config,
          particleCount: config.particleCount / 2,
          origin: { x: 0.5, y: 0.5 },
          startVelocity: 20,
        });
      }, 150);
    }
  }, []);

  return { fire };
}
