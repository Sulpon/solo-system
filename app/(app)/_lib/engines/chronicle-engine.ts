import { getLocalDayKey, parseLocalDayKey } from "../local-day";
import { isQuestScheduledForDate, calculateQuestConsistency } from "../daily-system";
import { deriveChallengeProgress } from "./challenge-engine";
import { calculateLevel } from "./level-engine";
import { buildCombinedXpEntries, calculateXPForRange } from "./progression-engine";
import { getPersonalRecords } from "./workout-engine";
import type { Category, CategoryId } from "../types/category";
import type { ActivityEvent, ActivityEventType } from "../types/activity-event";
import type { DailySnapshot } from "../types/daily-system";
import type { DailyJournalEntry, JournalPhoto } from "../types/journal";
import type { XpEvent } from "../types/progression";
import type { Quest, QuestCompletion } from "../types/quest";
import type { UnlockedReward } from "../types/reward";
import type { WorkoutSession } from "../types/workout";

// Everything Chronicle shows is derived from this bundle of already-existing
// records - Chronicle itself persists nothing except journalEntries (and the
// photo blobs referenced by them, via document-store.ts). No completion,
// streak, XP, or achievement logic is duplicated anywhere below; every
// function here calls straight through to the same pure functions the rest
// of the app already uses, just with a caller-supplied historical date.
export type ChronicleContext = Readonly<{
  quests: ReadonlyArray<Quest>;
  completions: ReadonlyArray<QuestCompletion>;
  xpEvents: ReadonlyArray<XpEvent>;
  activityEvents: ReadonlyArray<ActivityEvent>;
  workoutSessions: ReadonlyArray<WorkoutSession>;
  rewardCollection: ReadonlyArray<UnlockedReward>;
  dailySnapshots: ReadonlyArray<DailySnapshot>;
  journalEntries: ReadonlyArray<DailyJournalEntry>;
  categories: ReadonlyArray<Category>;
}>;

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function daysBetweenInclusive(start: Date, end: Date): number {
  return Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000) + 1;
}

// -----------------------------------------------------------------------
// 1. Habit Matrix (Month View)
// -----------------------------------------------------------------------

export type HabitCellState = "completed" | "challenge-completed" | "missed" | "no-data";

export type HabitMatrixRow = Readonly<{
  questId: string;
  title: string;
  cells: ReadonlyArray<HabitCellState>;
  completionRatePercent: number | null;
}>;

export type HabitMatrixMonth = Readonly<{
  year: number;
  month: number;
  daysInMonth: number;
  dayNumbers: ReadonlyArray<number>;
  rows: ReadonlyArray<HabitMatrixRow>;
}>;

// Reuses calculateQuestConsistency's existing rolling-window logic for a
// calendar month by choosing windowDays so the window lands exactly on
// [1st of month, end] - end is clamped to today for the current month so an
// in-progress month isn't penalized for days that haven't happened yet.
function getMonthCompletionRate(quest: Quest, completions: ReadonlyArray<QuestCompletion>, year: number, month: number, today: Date): number | null {
  const firstOfMonth = startOfDay(new Date(year, month, 1));
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lastOfMonth = startOfDay(new Date(year, month, daysInMonth));
  const todayStart = startOfDay(today);
  const end = lastOfMonth < todayStart ? lastOfMonth : todayStart;

  if (end < firstOfMonth) {
    return null;
  }

  const createdAt = quest.createdAt ? startOfDay(new Date(quest.createdAt)) : firstOfMonth;

  if (createdAt > end) {
    return null;
  }

  return calculateQuestConsistency(quest, completions, end, daysBetweenInclusive(firstOfMonth, end));
}

export function getHabitMatrixForMonth(quests: ReadonlyArray<Quest>, completions: ReadonlyArray<QuestCompletion>, year: number, month: number, today: Date = new Date()): HabitMatrixMonth {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayNumbers = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const todayStart = startOfDay(today);
  const firstOfMonth = startOfDay(new Date(year, month, 1));
  const lastOfMonth = startOfDay(new Date(year, month, daysInMonth));
  const dailyQuests = quests.filter((quest) => quest.cadence === "daily");

  const rows: HabitMatrixRow[] = dailyQuests.map((quest) => {
    const completionDays = new Set(completions.filter((completion) => completion.questId === quest.id).map((completion) => getLocalDayKey(completion.completedAt)));
    const createdAt = quest.createdAt ? startOfDay(new Date(quest.createdAt)) : null;
    const challengeReferenceEnd = lastOfMonth < todayStart ? lastOfMonth : todayStart;
    const challengeProgress = quest.challenge?.enabled && challengeReferenceEnd >= firstOfMonth ? deriveChallengeProgress(quest, completions, challengeReferenceEnd) : null;
    const challengeByDate = new Map((challengeProgress?.history ?? []).map((entry) => [entry.date, entry]));

    const cells: HabitCellState[] = dayNumbers.map((day) => {
      const cellDate = startOfDay(new Date(year, month, day));
      const dayKey = getLocalDayKey(cellDate);

      if (cellDate > todayStart) return "no-data";
      if (createdAt && cellDate < createdAt) return "no-data";
      if (!isQuestScheduledForDate(quest, cellDate)) return "no-data";
      if (!completionDays.has(dayKey)) return "missed";

      const challengeDay = challengeByDate.get(dayKey);
      return challengeDay?.passed ? "challenge-completed" : "completed";
    });

    return {
      questId: quest.id,
      title: quest.title,
      cells,
      completionRatePercent: getMonthCompletionRate(quest, completions, year, month, today),
    };
  });

  return { year, month, daysInMonth, dayNumbers, rows };
}

// -----------------------------------------------------------------------
// 2. Day Summary (Day View)
// -----------------------------------------------------------------------

export type DayQuestStatus = Readonly<{
  questId: string;
  title: string;
  state: HabitCellState;
  xpAwarded?: number;
}>;

export type DayHighlight = Readonly<{
  id: string;
  icon: string;
  title: string;
  detail?: string;
}>;

export type DaySummary = Readonly<{
  date: string;
  isToday: boolean;
  isFuture: boolean;
  level: number;
  xpEarned: number;
  questsCompletedCount: number;
  questsScheduledCount: number;
  questChecklist: ReadonlyArray<DayQuestStatus>;
  workoutSessions: ReadonlyArray<WorkoutSession>;
  highlights: ReadonlyArray<DayHighlight>;
  existingNarrative: string | null;
}>;

const HIGHLIGHT_EVENT_ICONS: ReadonlyArray<Readonly<{ type: ActivityEventType; icon: string }>> = [
  { type: "personal_record_achieved", icon: "PR" },
  { type: "level_up", icon: "LVL" },
  { type: "attribute_level_up", icon: "LVL" },
  { type: "challenge_level_up", icon: "CH" },
  { type: "challenge_completed", icon: "MSN" },
  { type: "streak_milestone", icon: "STREAK" },
  { type: "achievement_unlocked", icon: "★" },
  { type: "goal_completed", icon: "GOAL" },
  { type: "dream_completed", icon: "GOAL" },
  { type: "milestone_completed", icon: "GOAL" },
  { type: "progress_goal_completed", icon: "GOAL" },
];

function getScheduledDailyQuestsForDay(quests: ReadonlyArray<Quest>, dayStart: Date): Quest[] {
  return quests.filter((quest) => quest.cadence === "daily" && (!quest.createdAt || startOfDay(new Date(quest.createdAt)) <= dayStart) && isQuestScheduledForDate(quest, dayStart));
}

export function getDaySummary(date: string, context: ChronicleContext): DaySummary {
  const dayDate = parseLocalDayKey(date);
  const dayStart = startOfDay(dayDate);
  const dayEnd = endOfDay(dayDate);
  const todayStart = startOfDay(new Date());
  const isToday = dayStart.getTime() === todayStart.getTime();
  const isFuture = dayStart > todayStart;

  const completionsForDay = new Map<string, QuestCompletion>();
  context.completions.forEach((completion) => {
    if (getLocalDayKey(completion.completedAt) === date) {
      completionsForDay.set(completion.questId, completion);
    }
  });

  const scheduledQuests = getScheduledDailyQuestsForDay(context.quests, dayStart);
  const questChecklist: DayQuestStatus[] = scheduledQuests.map((quest) => {
    const completion = completionsForDay.get(quest.id);

    if (!completion) {
      return { questId: quest.id, title: quest.title, state: isFuture ? "no-data" : "missed" };
    }

    const challengeProgress = quest.challenge?.enabled ? deriveChallengeProgress(quest, context.completions, dayStart) : null;
    const challengeDay = challengeProgress?.history.find((entry) => entry.date === date);

    return {
      questId: quest.id,
      title: quest.title,
      state: challengeDay?.passed ? "challenge-completed" : "completed",
      xpAwarded: completion.xpAwarded,
    };
  });

  const xpEntries = buildCombinedXpEntries(context.completions, context.xpEvents);
  const xpEarned = calculateXPForRange(xpEntries, dayStart, dayEnd);
  const level = calculateLevel(calculateXPForRange(xpEntries, new Date(0), dayEnd)).currentLevel;
  const workoutSessions = context.workoutSessions.filter((session) => getLocalDayKey(session.endedAt) === date);

  const highlights: DayHighlight[] = context.activityEvents
    .filter((event) => getLocalDayKey(event.createdAt) === date)
    .flatMap((event) => {
      const match = HIGHLIGHT_EVENT_ICONS.find((entry) => entry.type === event.type);
      return match ? [{ id: event.id, icon: match.icon, title: event.title, detail: event.description }] : [];
    });

  const snapshot = context.dailySnapshots.find((item) => item.date === date);

  return {
    date,
    isToday,
    isFuture,
    level,
    xpEarned,
    questsCompletedCount: questChecklist.filter((item) => item.state === "completed" || item.state === "challenge-completed").length,
    questsScheduledCount: questChecklist.length,
    questChecklist,
    workoutSessions,
    highlights,
    existingNarrative: snapshot?.reflectionNote ?? null,
  };
}

// -----------------------------------------------------------------------
// 3. Timeline
// -----------------------------------------------------------------------

export type TimelineEntry = Readonly<{
  date: string;
  narrative: string | null;
  isAutoSummary: boolean;
  photos: ReadonlyArray<JournalPhoto>;
  xpEarned: number;
  questsCompletedCount: number;
  questsScheduledCount: number;
  highlights: ReadonlyArray<DayHighlight>;
  hasWorkout: boolean;
}>;

function buildAutoSummary(day: DaySummary): string {
  const parts: string[] = [];

  if (day.questsCompletedCount > 0) {
    parts.push(`Completed ${day.questsCompletedCount}/${day.questsScheduledCount} quests`);
  }

  if (day.workoutSessions.length > 0) {
    parts.push(`${day.workoutSessions.length} workout${day.workoutSessions.length === 1 ? "" : "s"} logged`);
  }

  if (day.highlights.length > 0) {
    parts.push(day.highlights.slice(0, 2).map((highlight) => highlight.title).join(", "));
  }

  return parts.length > 0 ? `${parts.join(". ")}.` : "";
}

// Newest first, matching the reference Timeline design. Never invents text -
// a day with no journal entry and no activity is simply omitted.
export function getTimelineEntries(startDate: string, endDate: string, context: ChronicleContext): TimelineEntry[] {
  const start = startOfDay(parseLocalDayKey(startDate));
  const end = startOfDay(parseLocalDayKey(endDate));
  const entries: TimelineEntry[] = [];
  const cursor = new Date(end);

  while (cursor >= start) {
    const dateKey = getLocalDayKey(cursor);
    const daySummary = getDaySummary(dateKey, context);
    const journalEntry = context.journalEntries.find((entry) => entry.date === dateKey);
    const hasActivity = daySummary.questsCompletedCount > 0 || daySummary.workoutSessions.length > 0 || daySummary.highlights.length > 0 || daySummary.xpEarned > 0;

    if (journalEntry || hasActivity) {
      entries.push({
        date: dateKey,
        narrative: journalEntry?.text || (hasActivity ? buildAutoSummary(daySummary) : null),
        isAutoSummary: !journalEntry?.text && hasActivity,
        photos: journalEntry?.photos ?? [],
        xpEarned: daySummary.xpEarned,
        questsCompletedCount: daySummary.questsCompletedCount,
        questsScheduledCount: daySummary.questsScheduledCount,
        highlights: daySummary.highlights,
        hasWorkout: daySummary.workoutSessions.length > 0,
      });
    }

    cursor.setDate(cursor.getDate() - 1);
  }

  return entries;
}

// -----------------------------------------------------------------------
// 4. Year Overview
// -----------------------------------------------------------------------

export type YearHeatmapCell = Readonly<{
  date: string;
  xpEarned: number;
  questsCompletedCount: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}>;

export type YearMilestone = Readonly<{
  id: string;
  date: string;
  title: string;
  detail?: string;
}>;

export type YearBestStreak = Readonly<{
  questTitle: string;
  days: number;
  startDate: string;
  endDate: string;
}>;

export type YearOverview = Readonly<{
  year: number;
  throughDate: string;
  heatmap: ReadonlyArray<YearHeatmapCell>;
  productiveDays: number;
  totalWorkouts: number;
  totalQuestsCompleted: number;
  totalXpEarned: number;
  averageCompletionPercent: number;
  bestDay: Readonly<{ date: string; xpEarned: number }> | null;
  bestStreak: YearBestStreak | null;
  mostActiveMonth: Readonly<{ month: number; xpEarned: number }> | null;
  majorMilestones: ReadonlyArray<YearMilestone>;
}>;

function getLongestStreakInRange(quest: Quest, completions: ReadonlyArray<QuestCompletion>, start: Date, end: Date): YearBestStreak | null {
  const completionDays = new Set(completions.filter((completion) => completion.questId === quest.id).map((completion) => getLocalDayKey(completion.completedAt)));
  let best = 0;
  let bestStart: string | null = null;
  let bestEnd: string | null = null;
  let current = 0;
  let currentStart: string | null = null;
  const cursor = new Date(start);

  while (cursor <= end) {
    if (isQuestScheduledForDate(quest, cursor)) {
      const dayKey = getLocalDayKey(cursor);

      if (completionDays.has(dayKey)) {
        if (current === 0) currentStart = dayKey;
        current += 1;

        if (current > best) {
          best = current;
          bestStart = currentStart;
          bestEnd = dayKey;
        }
      } else {
        current = 0;
        currentStart = null;
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return best > 0 && bestStart && bestEnd ? { questTitle: quest.title, days: best, startDate: bestStart, endDate: bestEnd } : null;
}

const MAJOR_MILESTONE_TYPES: ReadonlyArray<ActivityEventType> = ["level_up", "achievement_unlocked", "goal_completed", "dream_completed", "streak_milestone", "personal_record_achieved", "challenge_completed"];

export function getYearOverview(year: number, context: ChronicleContext, today: Date = new Date()): YearOverview {
  const todayStart = startOfDay(today);
  const jan1 = startOfDay(new Date(year, 0, 1));
  const dec31 = startOfDay(new Date(year, 11, 31));
  const throughDate = dec31 < todayStart ? dec31 : todayStart;
  const xpEntries = buildCombinedXpEntries(context.completions, context.xpEvents);

  const heatmap: YearHeatmapCell[] = [];
  const monthlyXp = new Array(12).fill(0) as number[];
  let productiveDays = 0;
  let totalQuestsCompleted = 0;
  let totalXpEarned = 0;
  let scheduledSum = 0;
  let completedSum = 0;
  let bestDay: { date: string; xpEarned: number } | null = null;

  if (throughDate >= jan1) {
    const cursor = new Date(jan1);

    while (cursor <= throughDate) {
      const dateKey = getLocalDayKey(cursor);
      const xpEarned = calculateXPForRange(xpEntries, startOfDay(cursor), endOfDay(cursor));
      const scheduledQuests = getScheduledDailyQuestsForDay(context.quests, startOfDay(cursor));
      const completedCount = scheduledQuests.filter((quest) => context.completions.some((completion) => completion.questId === quest.id && getLocalDayKey(completion.completedAt) === dateKey)).length;

      scheduledSum += scheduledQuests.length;
      completedSum += completedCount;
      totalQuestsCompleted += completedCount;
      totalXpEarned += xpEarned;
      monthlyXp[cursor.getMonth()] += xpEarned;

      if (xpEarned > 0 || completedCount > 0) {
        productiveDays += 1;
      }

      if (!bestDay || xpEarned > bestDay.xpEarned) {
        bestDay = { date: dateKey, xpEarned };
      }

      const intensity: YearHeatmapCell["intensity"] = xpEarned <= 0 ? 0 : xpEarned < 50 ? 1 : xpEarned < 100 ? 2 : xpEarned < 200 ? 3 : 4;
      heatmap.push({ date: dateKey, xpEarned, questsCompletedCount: completedCount, intensity });

      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const dailyQuests = context.quests.filter((quest) => quest.cadence === "daily");
  let bestStreak: YearBestStreak | null = null;
  dailyQuests.forEach((quest) => {
    const streak = getLongestStreakInRange(quest, context.completions, jan1, throughDate);
    if (streak && (!bestStreak || streak.days > bestStreak.days)) {
      bestStreak = streak;
    }
  });

  let mostActiveMonth: { month: number; xpEarned: number } | null = null;
  monthlyXp.forEach((xp, month) => {
    if (xp > 0 && (!mostActiveMonth || xp > mostActiveMonth.xpEarned)) {
      mostActiveMonth = { month, xpEarned: xp };
    }
  });

  const majorMilestones: YearMilestone[] = context.activityEvents
    .filter((event) => MAJOR_MILESTONE_TYPES.includes(event.type) && event.createdAt >= jan1.toISOString() && event.createdAt <= throughDate.toISOString())
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
    .slice(0, 12)
    .map((event) => ({ id: event.id, date: getLocalDayKey(event.createdAt), title: event.title, detail: event.description }));

  return {
    year,
    throughDate: getLocalDayKey(throughDate),
    heatmap,
    productiveDays,
    totalWorkouts: context.workoutSessions.filter((session) => { const key = getLocalDayKey(session.endedAt); return key >= getLocalDayKey(jan1) && key <= getLocalDayKey(throughDate); }).length,
    totalQuestsCompleted,
    totalXpEarned,
    averageCompletionPercent: scheduledSum > 0 ? Math.round((completedSum / scheduledSum) * 100) : 0,
    bestDay: bestDay && bestDay.xpEarned > 0 ? bestDay : null,
    bestStreak,
    mostActiveMonth,
    majorMilestones,
  };
}

// -----------------------------------------------------------------------
// 5. Stats & Insights
// -----------------------------------------------------------------------

export type CategoryBreakdownEntry = Readonly<{
  categoryId: CategoryId;
  categoryName: string;
  xp: number;
  percent: number;
}>;

export type ConsistencyTrendPoint = Readonly<{ label: string; percent: number }>;

export type ConsistencyStats = Readonly<{
  completionConsistencyPercent: number;
  weeklyTrend: ReadonlyArray<ConsistencyTrendPoint>;
  averageDailyXp: number;
  bestDay: Readonly<{ date: string; xpEarned: number }> | null;
  bestStreak: YearBestStreak | null;
  mostActiveMonthLabel: string | null;
  categoryBreakdown: ReadonlyArray<CategoryBreakdownEntry>;
  workoutsPerWeek: number;
  challengeCompletionRatePercent: number | null;
}>;

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function getConsistencyStats(startDate: string, endDate: string, context: ChronicleContext): ConsistencyStats {
  const start = startOfDay(parseLocalDayKey(startDate));
  const end = startOfDay(parseLocalDayKey(endDate));
  const xpEntries = buildCombinedXpEntries(context.completions, context.xpEvents);
  const totalDays = Math.max(1, daysBetweenInclusive(start, end));

  let scheduledSum = 0;
  let completedSum = 0;
  let totalXp = 0;
  let bestDay: { date: string; xpEarned: number } | null = null;
  const weekBuckets = new Map<string, { scheduled: number; completed: number }>();

  const cursor = new Date(start);
  while (cursor <= end) {
    const dateKey = getLocalDayKey(cursor);
    const scheduledQuests = getScheduledDailyQuestsForDay(context.quests, startOfDay(cursor));
    const completedCount = scheduledQuests.filter((quest) => context.completions.some((completion) => completion.questId === quest.id && getLocalDayKey(completion.completedAt) === dateKey)).length;
    const xpEarned = calculateXPForRange(xpEntries, startOfDay(cursor), endOfDay(cursor));

    scheduledSum += scheduledQuests.length;
    completedSum += completedCount;
    totalXp += xpEarned;

    if (!bestDay || xpEarned > bestDay.xpEarned) {
      bestDay = { date: dateKey, xpEarned };
    }

    const weekStart = new Date(cursor);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const weekKey = getLocalDayKey(weekStart);
    const bucket = weekBuckets.get(weekKey) ?? { scheduled: 0, completed: 0 };
    bucket.scheduled += scheduledQuests.length;
    bucket.completed += completedCount;
    weekBuckets.set(weekKey, bucket);

    cursor.setDate(cursor.getDate() + 1);
  }

  const weeklyTrend: ConsistencyTrendPoint[] = Array.from(weekBuckets.entries())
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([weekKey, bucket]) => ({
      label: weekKey,
      percent: bucket.scheduled > 0 ? Math.round((bucket.completed / bucket.scheduled) * 100) : 0,
    }));

  const dailyQuests = context.quests.filter((quest) => quest.cadence === "daily");
  let bestStreak: YearBestStreak | null = null;
  dailyQuests.forEach((quest) => {
    const streak = getLongestStreakInRange(quest, context.completions, start, end);
    if (streak && (!bestStreak || streak.days > bestStreak.days)) {
      bestStreak = streak;
    }
  });

  const monthlyXp = new Map<string, number>();
  const cursor2 = new Date(start);
  while (cursor2 <= end) {
    const monthKey = `${cursor2.getFullYear()}-${cursor2.getMonth()}`;
    const xpEarned = calculateXPForRange(xpEntries, startOfDay(cursor2), endOfDay(cursor2));
    monthlyXp.set(monthKey, (monthlyXp.get(monthKey) ?? 0) + xpEarned);
    cursor2.setDate(cursor2.getDate() + 1);
  }
  let mostActiveMonthLabel: string | null = null;
  let mostActiveMonthXp = 0;
  monthlyXp.forEach((xp, monthKey) => {
    if (xp > mostActiveMonthXp) {
      mostActiveMonthXp = xp;
      const [, month] = monthKey.split("-").map(Number);
      mostActiveMonthLabel = MONTH_LABELS[month] ?? null;
    }
  });

  const attributeXp = new Map<CategoryId, number>();
  context.completions
    .filter((completion) => { const key = getLocalDayKey(completion.completedAt); return key >= startDate && key <= endDate; })
    .forEach((completion) => {
      const rewards = completion.attributeRewardsAwarded.length > 0 ? completion.attributeRewardsAwarded : [];
      rewards.forEach((reward) => attributeXp.set(reward.attributeId, (attributeXp.get(reward.attributeId) ?? 0) + reward.xp));
    });
  context.xpEvents
    .filter((event) => { const key = getLocalDayKey(event.createdAt); return key >= startDate && key <= endDate; })
    .forEach((event) => event.attributeXp.forEach((reward) => attributeXp.set(reward.attributeId, (attributeXp.get(reward.attributeId) ?? 0) + reward.amount)));

  const attributeXpTotal = Array.from(attributeXp.values()).reduce((sum, xp) => sum + xp, 0);
  const categoryBreakdown: CategoryBreakdownEntry[] = context.categories
    .map((category) => {
      const xp = attributeXp.get(category.id) ?? 0;
      return { categoryId: category.id, categoryName: category.name, xp, percent: attributeXpTotal > 0 ? Math.round((xp / attributeXpTotal) * 100) : 0 };
    })
    .filter((entry) => entry.xp > 0)
    .sort((first, second) => second.xp - first.xp);

  const workoutsInRange = context.workoutSessions.filter((session) => { const key = getLocalDayKey(session.endedAt); return key >= startDate && key <= endDate; });
  const workoutsPerWeek = Math.round((workoutsInRange.length / totalDays) * 7 * 10) / 10;

  const challengeQuests = context.quests.filter((quest) => quest.challenge?.enabled);
  let challengeTotalDays = 0;
  let challengeSuccessDays = 0;
  challengeQuests.forEach((quest) => {
    const progress = deriveChallengeProgress(quest, context.completions, end);
    progress?.history.forEach((entry) => {
      if (entry.date >= startDate && entry.date <= endDate) {
        challengeTotalDays += 1;
        if (entry.passed) challengeSuccessDays += 1;
      }
    });
  });

  return {
    completionConsistencyPercent: scheduledSum > 0 ? Math.round((completedSum / scheduledSum) * 100) : 0,
    weeklyTrend,
    averageDailyXp: Math.round(totalXp / totalDays),
    bestDay: bestDay && bestDay.xpEarned > 0 ? bestDay : null,
    bestStreak,
    mostActiveMonthLabel,
    categoryBreakdown,
    workoutsPerWeek,
    challengeCompletionRatePercent: challengeTotalDays > 0 ? Math.round((challengeSuccessDays / challengeTotalDays) * 100) : null,
  };
}

export type Insight = Readonly<{ id: string; text: string }>;

const MIN_SAMPLE_SIZE = 5;

// Deterministic and data-gated: an insight only appears when there are
// enough days on both sides of the comparison to say something meaningful.
export function getInsights(startDate: string, endDate: string, context: ChronicleContext): Insight[] {
  const start = startOfDay(parseLocalDayKey(startDate));
  const end = startOfDay(parseLocalDayKey(endDate));
  const insights: Insight[] = [];

  const workoutDayKeys = new Set(context.workoutSessions.map((session) => getLocalDayKey(session.endedAt)));
  let withWorkoutScheduled = 0;
  let withWorkoutCompleted = 0;
  let withoutWorkoutScheduled = 0;
  let withoutWorkoutCompleted = 0;

  const cursor = new Date(start);
  while (cursor <= end) {
    const dateKey = getLocalDayKey(cursor);
    const scheduledQuests = getScheduledDailyQuestsForDay(context.quests, startOfDay(cursor));
    const completedCount = scheduledQuests.filter((quest) => context.completions.some((completion) => completion.questId === quest.id && getLocalDayKey(completion.completedAt) === dateKey)).length;

    if (workoutDayKeys.has(dateKey)) {
      withWorkoutScheduled += scheduledQuests.length;
      withWorkoutCompleted += completedCount;
    } else {
      withoutWorkoutScheduled += scheduledQuests.length;
      withoutWorkoutCompleted += completedCount;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  const workoutDaySampleSize = Array.from(workoutDayKeys).filter((key) => key >= startDate && key <= endDate).length;
  if (workoutDaySampleSize >= MIN_SAMPLE_SIZE && withWorkoutScheduled > 0 && withoutWorkoutScheduled > 0) {
    const withRate = Math.round((withWorkoutCompleted / withWorkoutScheduled) * 100);
    const withoutRate = Math.round((withoutWorkoutCompleted / withoutWorkoutScheduled) * 100);
    if (withRate > withoutRate + 5) {
      insights.push({ id: "workout-day-consistency", text: `Your completion rate is ${withRate}% on days you work out, vs. ${withoutRate}% on days you don't.` });
    }
  }

  const stats = getConsistencyStats(startDate, endDate, context);
  if (stats.bestStreak && stats.bestStreak.days >= 7) {
    insights.push({ id: "best-streak", text: `Your longest streak in this range is ${stats.bestStreak.questTitle} at ${stats.bestStreak.days} consecutive days.` });
  }

  const midpoint = new Date((start.getTime() + end.getTime()) / 2);
  const firstHalfXp = calculateXPForRange(buildCombinedXpEntries(context.completions, context.xpEvents), start, midpoint);
  const secondHalfXp = calculateXPForRange(buildCombinedXpEntries(context.completions, context.xpEvents), midpoint, end);
  if (firstHalfXp >= 100 && secondHalfXp >= 100) {
    const change = Math.round(((secondHalfXp - firstHalfXp) / firstHalfXp) * 100);
    if (Math.abs(change) >= 10) {
      insights.push({ id: "xp-trend", text: `You earned ${Math.abs(change)}% ${change >= 0 ? "more" : "less"} XP in the second half of this range than the first.` });
    }
  }

  return insights;
}
