import { getLocalDayKey } from "../local-day";
import type { WritingLogEntry } from "../types/writing-log";

// ---------------------------------------------------------------------------
// Writing log: calendar grouping, totals, and averages. Mirrors the shape of
// workout-engine.ts's calendar/frequency helpers so the same visual pattern
// (month grid, weekly/monthly buckets) applies to thesis writing.
// ---------------------------------------------------------------------------

export function getWritingCalendarData(entries: ReadonlyArray<WritingLogEntry>): Map<string, number> {
  const byDay = new Map<string, number>();

  entries.forEach((entry) => {
    byDay.set(entry.date, (byDay.get(entry.date) ?? 0) + entry.pages);
  });

  return byDay;
}

// Raw entries grouped by day (not just the summed total) so a calendar day's
// detail view can edit or delete the individual records behind the number.
export function getWritingLogEntriesByDay(entries: ReadonlyArray<WritingLogEntry>): Map<string, WritingLogEntry[]> {
  const byDay = new Map<string, WritingLogEntry[]>();

  entries.forEach((entry) => {
    const existing = byDay.get(entry.date);

    if (existing) {
      existing.push(entry);
    } else {
      byDay.set(entry.date, [entry]);
    }
  });

  return byDay;
}

export function getTotalPagesWritten(entries: ReadonlyArray<WritingLogEntry>): number {
  return entries.reduce((sum, entry) => sum + entry.pages, 0);
}

function startOfWeek(referenceDate: Date) {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function pagesInRange(entries: ReadonlyArray<WritingLogEntry>, start: Date, end: Date) {
  const startKey = getLocalDayKey(start);
  const endKey = getLocalDayKey(end);
  return entries.filter((entry) => entry.date >= startKey && entry.date <= endKey).reduce((sum, entry) => sum + entry.pages, 0);
}

export function getPagesWrittenToday(entries: ReadonlyArray<WritingLogEntry>, referenceDate = new Date()): number {
  const todayKey = getLocalDayKey(referenceDate);
  return entries.filter((entry) => entry.date === todayKey).reduce((sum, entry) => sum + entry.pages, 0);
}

export function getPagesWrittenThisWeek(entries: ReadonlyArray<WritingLogEntry>, referenceDate = new Date()): number {
  const start = startOfWeek(referenceDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return pagesInRange(entries, start, end);
}

export function getPagesWrittenThisMonth(entries: ReadonlyArray<WritingLogEntry>, referenceDate = new Date()): number {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  return pagesInRange(entries, start, end);
}

// Average pages per day since the first logged entry (inclusive of days with
// no writing) - reflects real pace rather than only counting writing days.
export function getAveragePagesPerDay(entries: ReadonlyArray<WritingLogEntry>, referenceDate = new Date()): number {
  if (entries.length === 0) {
    return 0;
  }

  const earliestKey = entries.reduce((earliest, entry) => (entry.date < earliest ? entry.date : earliest), entries[0].date);
  const earliestDate = new Date(`${earliestKey}T00:00:00`);
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const daysSinceFirst = Math.max(1, Math.floor((today.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  return Math.round((getTotalPagesWritten(entries) / daysSinceFirst) * 10) / 10;
}

export type BestWritingDay = Readonly<{ date: string; pages: number }>;

export function getBestWritingDay(entries: ReadonlyArray<WritingLogEntry>): BestWritingDay | null {
  const byDay = getWritingCalendarData(entries);
  let best: BestWritingDay | null = null;

  for (const [date, pages] of byDay.entries()) {
    if (!best || pages > best.pages) {
      best = { date, pages };
    }
  }

  return best;
}
