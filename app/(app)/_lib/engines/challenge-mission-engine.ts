// Pure derived-data functions for the Challenges feature (see
// types/challenge.ts). Unrelated to engines/challenge-engine.ts's per-Quest
// streak-leveling mechanic - see the note at the top of types/challenge.ts.
//
// Nothing here awards XP or reads/writes progression state - Challenges are
// deliberately outside that system.

import { getLocalDayKey, parseLocalDayKey } from "../local-day";
import type { Challenge, ChallengeEntry, ChallengeMetric } from "../types/challenge";

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function getChallengeDayKeys(challenge: Challenge): string[] {
  const keys: string[] = [];
  let cursor = challenge.startDate;
  let guard = 0;

  while (cursor <= challenge.endDate && guard < 1000) {
    keys.push(cursor);
    const date = parseLocalDayKey(cursor);
    date.setDate(date.getDate() + 1);
    cursor = getLocalDayKey(date);
    guard += 1;
  }

  return keys;
}

// 1-indexed, clamped to [1, durationDays] - "Day 2 of 21" style. A challenge
// not yet started (startDate in the future) clamps to day 1 rather than
// going negative.
export function getChallengeDayNumber(challenge: Challenge, today: Date = new Date()): number {
  const todayKey = getLocalDayKey(startOfDay(today));
  const elapsed = Math.round((startOfDay(parseLocalDayKey(todayKey)).getTime() - startOfDay(parseLocalDayKey(challenge.startDate)).getTime()) / 86400000) + 1;
  return Math.min(challenge.durationDays, Math.max(1, elapsed));
}

export function isChallengePastEndDate(challenge: Challenge, today: Date = new Date()): boolean {
  return getLocalDayKey(startOfDay(today)) > challenge.endDate;
}

export function getTimeProgressPercent(challenge: Challenge, today: Date = new Date()): number {
  return Math.round((getChallengeDayNumber(challenge, today) / challenge.durationDays) * 100);
}

function hasLoggedValue(entry: ChallengeEntry | undefined): boolean {
  if (!entry) return false;
  return entry.value !== undefined || Boolean(entry.photoId);
}

// Adherence across REQUIRED metrics only, over days that have actually
// elapsed (never penalizes future days that haven't happened yet). Returns
// null when there's nothing to measure yet (no required metrics, or the
// challenge hasn't started).
export function getRequiredMetricAdherencePercent(
  challenge: Challenge,
  metrics: ReadonlyArray<ChallengeMetric>,
  entries: ReadonlyArray<ChallengeEntry>,
  today: Date = new Date(),
): number | null {
  const requiredMetrics = metrics.filter((metric) => metric.required);
  if (requiredMetrics.length === 0) return null;

  const todayKey = getLocalDayKey(startOfDay(today));
  const elapsedDayKeys = getChallengeDayKeys(challenge).filter((day) => day <= todayKey);
  if (elapsedDayKeys.length === 0) return null;

  const entryByKey = new Map(entries.map((entry) => [`${entry.metricId}:${entry.date}`, entry]));
  let total = 0;
  let logged = 0;

  for (const day of elapsedDayKeys) {
    for (const metric of requiredMetrics) {
      total += 1;
      if (hasLoggedValue(entryByKey.get(`${metric.id}:${day}`))) {
        logged += 1;
      }
    }
  }

  return total > 0 ? Math.round((logged / total) * 100) : null;
}

// The longest run of consecutive elapsed days where every required metric
// was logged (any value counts - this measures "did the mission happen
// today", not whether any single numeric target was hit, since target
// direction varies per metric - see types/challenge.ts).
export function getBestFullAdherenceStreak(
  challenge: Challenge,
  metrics: ReadonlyArray<ChallengeMetric>,
  entries: ReadonlyArray<ChallengeEntry>,
  today: Date = new Date(),
): number {
  const requiredMetrics = metrics.filter((metric) => metric.required);
  if (requiredMetrics.length === 0) return 0;

  const todayKey = getLocalDayKey(startOfDay(today));
  const elapsedDayKeys = getChallengeDayKeys(challenge).filter((day) => day <= todayKey);
  const entryByKey = new Map(entries.map((entry) => [`${entry.metricId}:${entry.date}`, entry]));

  let best = 0;
  let current = 0;

  for (const day of elapsedDayKeys) {
    const allLogged = requiredMetrics.every((metric) => hasLoggedValue(entryByKey.get(`${metric.id}:${day}`)));
    current = allLogged ? current + 1 : 0;
    best = Math.max(best, current);
  }

  return best;
}

export type MetricTrendPoint = Readonly<{ date: string; value: number }>;

export type MetricNumericStats = Readonly<{
  average: number;
  first: MetricTrendPoint | null;
  latest: MetricTrendPoint | null;
  trend: ReadonlyArray<MetricTrendPoint>;
}>;

// number/rating metrics only - entries with a non-numeric or missing value
// are skipped rather than treated as zero.
export function getMetricNumericStats(metric: ChallengeMetric, entries: ReadonlyArray<ChallengeEntry>): MetricNumericStats | null {
  const trend: MetricTrendPoint[] = entries
    .filter((entry) => entry.metricId === metric.id && typeof entry.value === "number")
    .map((entry) => ({ date: entry.date, value: entry.value as number }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (trend.length === 0) return null;

  const average = Math.round((trend.reduce((sum, point) => sum + point.value, 0) / trend.length) * 10) / 10;

  return { average, first: trend[0], latest: trend[trend.length - 1], trend };
}

// boolean metrics only - fraction of elapsed days where the metric was
// checked (value === 1).
export function getBooleanCompletionPercent(challenge: Challenge, metric: ChallengeMetric, entries: ReadonlyArray<ChallengeEntry>, today: Date = new Date()): number | null {
  const todayKey = getLocalDayKey(startOfDay(today));
  const elapsedDayKeys = getChallengeDayKeys(challenge).filter((day) => day <= todayKey);
  if (elapsedDayKeys.length === 0) return null;

  const checkedDays = new Set(entries.filter((entry) => entry.metricId === metric.id && entry.value === 1).map((entry) => entry.date));
  const checkedElapsed = elapsedDayKeys.filter((day) => checkedDays.has(day)).length;

  return Math.round((checkedElapsed / elapsedDayKeys.length) * 100);
}
