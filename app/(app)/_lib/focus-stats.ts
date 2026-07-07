import { getLocalDayKey, parseLocalDayKey } from "./local-day";
import type { FocusHistoryEntry, FocusSession } from "./types/focus";

// --- Live timer math -------------------------------------------------------

export function getElapsedMs(session: FocusSession, referenceDate: Date = new Date()): number {
  const startedAtMs = new Date(session.startedAt).getTime();
  const endMs = session.pausedAt ? new Date(session.pausedAt).getTime() : referenceDate.getTime();
  return Math.max(0, endMs - startedAtMs - session.totalPausedMs);
}

export function getRemainingSeconds(session: FocusSession, referenceDate: Date = new Date()): number {
  const elapsedSeconds = getElapsedMs(session, referenceDate) / 1000;
  return Math.ceil(session.durationSeconds - elapsedSeconds);
}

// --- History aggregation ----------------------------------------------------

function minutesOf(entry: FocusHistoryEntry): number {
  return entry.duration / 60;
}

function isWithinLastDays(entry: FocusHistoryEntry, days: number, referenceDate: Date): boolean {
  const start = new Date(entry.start).getTime();
  const cutoff = new Date(referenceDate);
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  return start >= cutoff.getTime();
}

export function getTodayFocusMinutes(history: ReadonlyArray<FocusHistoryEntry>, referenceDate: Date = new Date()): number {
  const todayKey = getLocalDayKey(referenceDate);
  return Math.round(history.filter((entry) => getLocalDayKey(entry.start) === todayKey).reduce((sum, entry) => sum + minutesOf(entry), 0));
}

export function getWeeklyFocusMinutes(history: ReadonlyArray<FocusHistoryEntry>, referenceDate: Date = new Date()): number {
  return Math.round(history.filter((entry) => isWithinLastDays(entry, 7, referenceDate)).reduce((sum, entry) => sum + minutesOf(entry), 0));
}

export function getMonthlyFocusMinutes(history: ReadonlyArray<FocusHistoryEntry>, referenceDate: Date = new Date()): number {
  return Math.round(history.filter((entry) => isWithinLastDays(entry, 30, referenceDate)).reduce((sum, entry) => sum + minutesOf(entry), 0));
}

export function getLifetimeFocusMinutes(history: ReadonlyArray<FocusHistoryEntry>): number {
  return Math.round(history.reduce((sum, entry) => sum + minutesOf(entry), 0));
}

export function getDeepWorkMinutes(history: ReadonlyArray<FocusHistoryEntry>): number {
  return Math.round(
    history.filter((entry) => entry.mode === "deep-work").reduce((sum, entry) => sum + minutesOf(entry), 0),
  );
}

export function getLongestSessionMinutes(history: ReadonlyArray<FocusHistoryEntry>): number {
  return history.length === 0 ? 0 : Math.round(Math.max(...history.map(minutesOf)));
}

export function getAverageSessionMinutes(history: ReadonlyArray<FocusHistoryEntry>): number {
  return history.length === 0 ? 0 : Math.round(getLifetimeFocusMinutes(history) / history.length);
}

export function getSessionsCompletedToday(history: ReadonlyArray<FocusHistoryEntry>, referenceDate: Date = new Date()): number {
  const todayKey = getLocalDayKey(referenceDate);
  return history.filter((entry) => getLocalDayKey(entry.start) === todayKey && !entry.interrupted).length;
}

export function getFocusStreakDays(history: ReadonlyArray<FocusHistoryEntry>, referenceDate: Date = new Date()): number {
  const dayKeys = new Set(history.map((entry) => getLocalDayKey(entry.start)));
  let streak = 0;
  const cursor = new Date(referenceDate);
  cursor.setHours(0, 0, 0, 0);

  // A streak that hasn't been extended yet today still counts through
  // yesterday - only break it once a full day has passed with no session.
  if (!dayKeys.has(getLocalDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (dayKeys.has(getLocalDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function getDailyFocusBuckets(history: ReadonlyArray<FocusHistoryEntry>, days: number, referenceDate: Date = new Date()): number[] {
  const totals = new Map<string, number>();

  for (const entry of history) {
    const key = getLocalDayKey(entry.start);
    totals.set(key, (totals.get(key) ?? 0) + minutesOf(entry));
  }

  const buckets: number[] = [];
  const cursor = new Date(referenceDate);
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - (days - 1));

  for (let index = 0; index < days; index += 1) {
    buckets.push(Math.round(totals.get(getLocalDayKey(cursor)) ?? 0));
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
}

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function getWeeklyFocusSeries(history: ReadonlyArray<FocusHistoryEntry>, referenceDate: Date = new Date()) {
  const start = new Date(referenceDate);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - mondayOffset);

  return {
    values: getDailyFocusBuckets(history, 7, new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000)),
    labels: WEEKDAY_LABELS,
  };
}

export function isSameLocalDay(a: string, b: Date = new Date()): boolean {
  return getLocalDayKey(a) === getLocalDayKey(b);
}

export { getLocalDayKey, parseLocalDayKey };
