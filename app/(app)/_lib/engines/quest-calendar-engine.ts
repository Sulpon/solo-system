import { calculateQuestConsistency, calculateQuestStreak, getQuestCompletionCounts, isQuestScheduledForDate } from "../daily-system";
import { getLocalDayKey } from "../local-day";
import type { Quest, QuestCompletion } from "../types/quest";

export type QuestDayState = "completed" | "missed" | "future";

export type QuestCalendarDay = Readonly<{ dayKey: string; date: Date; state: QuestDayState }>;

// A day renders as "future" both when it hasn't happened yet AND when the
// quest wasn't scheduled that day - there's no third "not applicable" color,
// per the explicit decision to keep this binary (completed vs missed) rather
// than inventing a "partial" state the underlying data doesn't support.
export function buildQuestCalendarWeeks(quest: Quest, completions: ReadonlyArray<QuestCompletion>, weeksBack = 20, referenceDate = new Date()): QuestCalendarDay[][] {
  const completionDays = new Set(
    completions.filter((completion) => completion.questId === quest.id).map((completion) => getLocalDayKey(completion.completedAt)),
  );

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const todayDow = (today.getDay() + 6) % 7; // 0 = Monday
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + (6 - todayDow));
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - (weeksBack * 7 - 1));

  const days: QuestCalendarDay[] = [];
  const cursor = new Date(weekStart);

  while (cursor <= weekEnd) {
    const dayKey = getLocalDayKey(cursor);
    let state: QuestDayState;

    if (cursor > today || !isQuestScheduledForDate(quest, cursor)) {
      state = "future";
    } else if (completionDays.has(dayKey)) {
      state = "completed";
    } else {
      state = "missed";
    }

    days.push({ dayKey, date: new Date(cursor), state });
    cursor.setDate(cursor.getDate() + 1);
  }

  const weeks: QuestCalendarDay[][] = [];

  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }

  return weeks;
}

export function getAggregateQuestCalendarDays(completions: ReadonlyArray<QuestCompletion>, weeksBack = 20, referenceDate = new Date()): QuestCalendarDay[][] {
  const completionDays = new Set(completions.map((completion) => getLocalDayKey(completion.completedAt)));

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const todayDow = (today.getDay() + 6) % 7;
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + (6 - todayDow));
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - (weeksBack * 7 - 1));

  const days: QuestCalendarDay[] = [];
  const cursor = new Date(weekStart);

  while (cursor <= weekEnd) {
    const dayKey = getLocalDayKey(cursor);
    let state: QuestDayState;

    if (cursor > today) {
      state = "future";
    } else if (completionDays.has(dayKey)) {
      state = "completed";
    } else {
      state = "missed";
    }

    days.push({ dayKey, date: new Date(cursor), state });
    cursor.setDate(cursor.getDate() + 1);
  }

  const weeks: QuestCalendarDay[][] = [];

  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }

  return weeks;
}

// Longest historical run of consecutive *scheduled* days completed - the
// forward-scan counterpart to daily-system.ts's calculateQuestStreak, which
// only walks backward from today for the current streak.
export function calculateQuestBestStreak(quest: Quest, completions: ReadonlyArray<QuestCompletion>, referenceDate = new Date()): number {
  const completionDays = new Set(
    completions.filter((completion) => completion.questId === quest.id).map((completion) => getLocalDayKey(completion.completedAt)),
  );

  const start = new Date(quest.createdAt);
  start.setHours(0, 0, 0, 0);
  const end = new Date(referenceDate);
  end.setHours(0, 0, 0, 0);

  let best = 0;
  let running = 0;
  const cursor = new Date(start);

  while (cursor <= end) {
    if (isQuestScheduledForDate(quest, cursor)) {
      if (completionDays.has(getLocalDayKey(cursor))) {
        running += 1;
        best = Math.max(best, running);
      } else {
        running = 0;
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return best;
}

export type QuestCompletionRange = "weekly" | "monthly" | "yearly";

const RANGE_WINDOW_DAYS: Record<QuestCompletionRange, number> = {
  weekly: 7,
  monthly: 30,
  yearly: 365,
};

// Thin wrapper over daily-system.ts's calculateQuestConsistency, which
// already respects scheduledDays for the denominator - no need to
// reimplement that scheduling-aware math here.
export function getQuestCompletionPercent(quest: Quest, completions: ReadonlyArray<QuestCompletion>, range: QuestCompletionRange, referenceDate = new Date()): number {
  return calculateQuestConsistency(quest, completions, referenceDate, RANGE_WINDOW_DAYS[range]);
}

export { calculateQuestStreak };

// ---------------------------------------------------------------------------
// Per-quest detail panel calendar (Month/Week/Day views + day drill-down).
//
// Distinct from QuestDayState above: that type collapses "not scheduled" and
// "hasn't happened yet" into one "future" bucket, which is exactly right for
// the compact heatmap widget but not for a real calendar grid, where a user
// clicking a past Tuesday on a Mon/Wed/Fri quest needs to see "not
// scheduled," not a false "missed." QuestDayState/buildQuestCalendarWeeks
// themselves are untouched - every existing consumer keeps working exactly
// as before.
// ---------------------------------------------------------------------------

export type QuestCalendarDayStatus = "completed" | "missed" | "not-scheduled" | "future";

// A "one-time" quest has no scheduledDays (QuestForm hides that picker for
// it - see quest.ts), so isQuestScheduledForDate would otherwise treat every
// day as scheduled. It only ever has one meaningful day: whichever day it
// was actually completed on. Every other day is "not-scheduled," never
// "missed" - a one-time task doesn't have a recurring-miss concept.
export function getQuestDayStatus(quest: Quest, completions: ReadonlyArray<QuestCompletion>, date: Date, referenceDate = new Date()): QuestCalendarDayStatus {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const dayKey = getLocalDayKey(target);
  const isCompleted = completions.some((completion) => completion.questId === quest.id && getLocalDayKey(completion.completedAt) === dayKey);

  if (isCompleted) {
    return "completed";
  }

  if (target > today) {
    return "future";
  }

  const isScheduled = quest.cadence === "one-time" ? false : isQuestScheduledForDate(quest, target);

  return isScheduled ? "missed" : "not-scheduled";
}

export type QuestCalendarCell = Readonly<{ date: Date; dayKey: string; status: QuestCalendarDayStatus; inCurrentPeriod: boolean }>;

function startOfWeekMonday(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const dow = (result.getDay() + 6) % 7; // 0 = Monday
  result.setDate(result.getDate() - dow);
  return result;
}

function buildCell(quest: Quest, completions: ReadonlyArray<QuestCompletion>, date: Date, referenceDate: Date, inCurrentPeriod: boolean): QuestCalendarCell {
  return { date: new Date(date), dayKey: getLocalDayKey(date), status: getQuestDayStatus(quest, completions, date, referenceDate), inCurrentPeriod };
}

// A full 6-row (42-day) month grid, Monday-first, including the leading/
// trailing days from adjacent months (inCurrentPeriod: false) so the UI can
// render a real rectangular calendar.
export function buildQuestCalendarMonth(quest: Quest, completions: ReadonlyArray<QuestCompletion>, year: number, month: number, referenceDate = new Date()): QuestCalendarCell[][] {
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = startOfWeekMonday(firstOfMonth);

  const weeks: QuestCalendarCell[][] = [];
  const cursor = new Date(gridStart);

  for (let week = 0; week < 6; week += 1) {
    const days: QuestCalendarCell[] = [];
    for (let day = 0; day < 7; day += 1) {
      days.push(buildCell(quest, completions, cursor, referenceDate, cursor.getMonth() === month));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(days);
  }

  return weeks;
}

export function buildQuestCalendarWeek(quest: Quest, completions: ReadonlyArray<QuestCompletion>, anyDateInWeek: Date, referenceDate = new Date()): QuestCalendarCell[] {
  const weekStart = startOfWeekMonday(anyDateInWeek);
  const days: QuestCalendarCell[] = [];
  const cursor = new Date(weekStart);

  for (let day = 0; day < 7; day += 1) {
    days.push(buildCell(quest, completions, cursor, referenceDate, true));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

export type QuestDayDetail = Readonly<{
  status: QuestCalendarDayStatus;
  completion: QuestCompletion | null;
}>;

// "What happened for THIS quest on THIS date" - the exact question section
// 11 of the spec insists on, never "what quests exist on this date."
export function getQuestDayDetail(quest: Quest, completions: ReadonlyArray<QuestCompletion>, date: Date, referenceDate = new Date()): QuestDayDetail {
  const dayKey = getLocalDayKey(date);
  const completion = completions.find((entry) => entry.questId === quest.id && getLocalDayKey(entry.completedAt) === dayKey) ?? null;

  return { status: getQuestDayStatus(quest, completions, date, referenceDate), completion };
}

export type QuestActivityEntry = Readonly<{ dayKey: string; date: Date; status: "completed" | "missed"; completion: QuestCompletion | null }>;

// The quest's own completed/missed days over the last `days` days, newest
// first - real derived history, not a separate log. "not-scheduled"/
// "future" days are omitted, matching the reference concept's activity feed
// only ever showing things that actually happened.
export function getQuestRecentActivity(quest: Quest, completions: ReadonlyArray<QuestCompletion>, days = 14, referenceDate = new Date()): QuestActivityEntry[] {
  const entries: QuestActivityEntry[] = [];
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const cursor = new Date(today);
  cursor.setDate(cursor.getDate() - (days - 1));

  while (cursor <= today) {
    const detail = getQuestDayDetail(quest, completions, cursor, referenceDate);

    if (detail.status === "completed" || detail.status === "missed") {
      entries.push({ dayKey: getLocalDayKey(cursor), date: new Date(cursor), status: detail.status, completion: detail.completion });
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return entries.reverse();
}

export type QuestDetailStats = Readonly<{
  currentStreak: number;
  longestStreak: number;
  completionRatePercent: number;
  totalCompletions: number;
  totalScheduledDays: number;
  totalXpEarned: number;
}>;

// Every field here is a direct read or a call into an existing, already-
// trusted function - nothing here invents a new formula.
export function getQuestDetailStats(quest: Quest, completions: ReadonlyArray<QuestCompletion>, referenceDate = new Date()): QuestDetailStats {
  const questCompletions = completions.filter((completion) => completion.questId === quest.id);
  const counts = getQuestCompletionCounts(quest, completions, referenceDate, 3650);

  return {
    currentStreak: calculateQuestStreak(quest, completions, referenceDate),
    longestStreak: calculateQuestBestStreak(quest, completions, referenceDate),
    completionRatePercent: counts.scheduledDays === 0 ? 0 : Math.round((counts.completedDays / counts.scheduledDays) * 100),
    totalCompletions: questCompletions.length,
    totalScheduledDays: counts.scheduledDays,
    totalXpEarned: questCompletions.reduce((sum, completion) => sum + completion.xpAwarded, 0),
  };
}
