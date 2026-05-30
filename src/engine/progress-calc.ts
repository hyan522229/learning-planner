import type { SpeedRecord } from '@/types';

export function calculateEWMA(records: SpeedRecord[]): number {
  if (records.length === 0) return 0;
  if (records.length === 1) return records[0].speed;

  const alpha = 2 / (7 + 1); // 7-day window

  const sorted = [...records].sort((a, b) => a.date - b.date);

  let ewma = sorted[0].speed;
  for (let i = 1; i < sorted.length; i++) {
    ewma = alpha * sorted[i].speed + (1 - alpha) * ewma;
  }
  return Math.round(ewma * 100) / 100;
}

export function recordSpeed(
  amountCompleted: number,
  durationMinutes: number
): SpeedRecord {
  return {
    date: Date.now(),
    amountCompleted,
    durationMinutes,
    speed: durationMinutes > 0 ? amountCompleted / (durationMinutes / 60) : 0,
  };
}

export function calculateProgress(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((completed / total) * 100));
}
