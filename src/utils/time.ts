/** Format minutes as compact display: 165 → "2h45m", 30 → "30m", 0 → "0m" */
export function formatDurationCompact(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}

/** Format minutes as readable: 165 → "2小时45分钟" */
export function formatDurationReadable(minutes: number): string {
  if (minutes <= 0) return '0分钟';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}分钟`;
  if (m === 0) return `${h}小时`;
  return `${h}小时${m}分钟`;
}

/** Parse time string "2h45m" to minutes */
export function parseDurationCompact(input: string): number {
  const hMatch = input.match(/(\d+)\s*h/i);
  const mMatch = input.match(/(\d+)\s*m/i);
  const hours = hMatch ? parseInt(hMatch[1]) : 0;
  const minutes = mMatch ? parseInt(mMatch[1]) : 0;
  return hours * 60 + minutes;
}

/** Check if a time string (HH:MM) is in the past for today */
export function isTimeInPast(timeStr: string): boolean {
  const now = new Date();
  const [h, m] = timeStr.split(':').map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const slotMinutes = h * 60 + m;
  return slotMinutes < currentMinutes;
}
