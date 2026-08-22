import { getLocalDayKey } from "../local-day";
import type { TradeLogEntry } from "../types/trade-log";

// ---------------------------------------------------------------------------
// Trade log: calendar grouping, totals, and averages. Mirrors
// thesis-engine.ts's writing-log helpers - same shape, same conventions.
// ---------------------------------------------------------------------------

export function getTradesCalendarData(entries: ReadonlyArray<TradeLogEntry>): Map<string, number> {
  const byDay = new Map<string, number>();

  entries.forEach((entry) => {
    byDay.set(entry.date, (byDay.get(entry.date) ?? 0) + entry.count);
  });

  return byDay;
}

export function getTradesLoggedForDay(entries: ReadonlyArray<TradeLogEntry>, dayKey: string): number {
  return entries.filter((entry) => entry.date === dayKey).reduce((sum, entry) => sum + entry.count, 0);
}

export function getTotalTradesLogged(entries: ReadonlyArray<TradeLogEntry>): number {
  return entries.reduce((sum, entry) => sum + entry.count, 0);
}

function startOfWeek(referenceDate: Date) {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function tradesInRange(entries: ReadonlyArray<TradeLogEntry>, start: Date, end: Date) {
  const startKey = getLocalDayKey(start);
  const endKey = getLocalDayKey(end);
  return entries.filter((entry) => entry.date >= startKey && entry.date <= endKey).reduce((sum, entry) => sum + entry.count, 0);
}

export function getTradesLoggedToday(entries: ReadonlyArray<TradeLogEntry>, referenceDate = new Date()): number {
  return getTradesLoggedForDay(entries, getLocalDayKey(referenceDate));
}

export function getTradesLoggedThisWeek(entries: ReadonlyArray<TradeLogEntry>, referenceDate = new Date()): number {
  const start = startOfWeek(referenceDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return tradesInRange(entries, start, end);
}

export function getTradesLoggedThisMonth(entries: ReadonlyArray<TradeLogEntry>, referenceDate = new Date()): number {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  return tradesInRange(entries, start, end);
}

export type BestTradingDay = Readonly<{ date: string; count: number }>;

export function getBestTradingDay(entries: ReadonlyArray<TradeLogEntry>): BestTradingDay | null {
  const byDay = getTradesCalendarData(entries);
  let best: BestTradingDay | null = null;

  for (const [date, count] of byDay.entries()) {
    if (!best || count > best.count) {
      best = { date, count };
    }
  }

  return best;
}
