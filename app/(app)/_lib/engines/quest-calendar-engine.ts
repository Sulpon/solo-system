import { calculateQuestConsistency, calculateQuestStreak, isQuestScheduledForDate } from "../daily-system";
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
