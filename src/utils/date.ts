import { startOfDay, endOfDay, addDays, format, isToday, isTomorrow, differenceInMinutes, parse, setHours, setMinutes, getHours, getMinutes } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function todayStart(): number {
  return startOfDay(new Date()).getTime();
}

export function todayEnd(): number {
  return endOfDay(new Date()).getTime();
}

export function formatDate(epoch: number, fmt: string = 'yyyy-MM-dd'): string {
  return format(new Date(epoch), fmt, { locale: zhCN });
}

export function formatTime(epoch: number): string {
  return format(new Date(epoch), 'HH:mm');
}

export function formatDateShort(epoch: number): string {
  const d = new Date(epoch);
  if (isToday(d)) return '今天';
  if (isTomorrow(d)) return '明天';
  return format(d, 'MM/dd');
}

export function isDateToday(epoch: number): boolean {
  return isToday(new Date(epoch));
}

export function isDateTomorrow(epoch: number): boolean {
  return isTomorrow(new Date(epoch));
}

export function addDaysToEpoch(epoch: number, days: number): number {
  return addDays(new Date(epoch), days).getTime();
}

export function minutesBetween(start: string, end: string): number {
  const s = parse(start, 'HH:mm', new Date());
  const e = parse(end, 'HH:mm', new Date());
  return differenceInMinutes(e, s);
}

export function timeStringToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function startOfDayEpoch(date: Date = new Date()): number {
  return startOfDay(date).getTime();
}

export function endOfDayEpoch(date: Date = new Date()): number {
  return endOfDay(date).getTime();
}

export function currentTimeString(): string {
  const now = new Date();
  return `${String(getHours(now)).padStart(2, '0')}:${String(getMinutes(now)).padStart(2, '0')}`;
}
