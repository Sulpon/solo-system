// Small, shared time-of-day helpers for the scheduling grid (Week/Day
// views). Quest stores scheduled times as plain "HH:MM" 24h local strings -
// no Date objects, no timezone conversion, so "10:00" always means 10:00
// wherever/whenever it's read (see Quest.scheduledStartTime in types/quest.ts).

export const SNAP_MINUTES = 30;
export const DEFAULT_DURATION_MINUTES = 30;
export const MINUTES_PER_DAY = 24 * 60;
export const WORK_HOURS_START = 8;
export const WORK_HOURS_END = 18;

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(MINUTES_PER_DAY, Math.round(totalMinutes)));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function snapMinutes(minutes: number, increment: number = SNAP_MINUTES): number {
  return Math.round(minutes / increment) * increment;
}

export function formatTimeLabel(time: string): string {
  const minutes = timeToMinutes(time);
  const date = new Date();
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatHourLabel(hour: number): string {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: hour % 1 === 0 ? undefined : "2-digit" });
}
