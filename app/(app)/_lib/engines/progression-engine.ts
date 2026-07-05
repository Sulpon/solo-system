import { calculateLevel } from "./level-engine";
import { getLocalDayKey } from "../local-day";
import type { Category, CategoryId } from "../types/category";
import type { Quest, QuestCompletion, Task } from "../types/quest";
import type { XpEvent, XpEventAttributeReward } from "../types/progression";

export function calculateTotalXP(tasks: ReadonlyArray<Pick<Task, "xp" | "completed">>) {
  return tasks.reduce((total, task) => (task.completed ? total + task.xp : total), 0);
}

export type CategoryProgression = Category &
  Readonly<{
    level: number;
    xp: number;
    max: number;
    progress: number;
    xpInCurrentLevel: number;
    xpNeededForNextLevel: number;
  }>;

export type ProgressionSummary = Readonly<{
  totalXP: number;
  currentLevel: number;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  progress: number;
  currentStreak: number;
  dailyXP: number;
  weeklyXP: number;
  completedQuests: number;
  powerScore: number;
  categoryProgression: CategoryProgression[];
  categoryProgressionMap: Readonly<Record<CategoryId, CategoryProgression>>;
}>;

type XpEntry = Readonly<{
  completedAt: string;
  amount: number;
}>;

function buildCombinedXpEntries(completions: ReadonlyArray<QuestCompletion>, goalXpEvents: ReadonlyArray<XpEvent>) {
  const questEntries: XpEntry[] = completions.map((completion) => ({
    completedAt: completion.completedAt,
    amount: completion.xpAwarded,
  }));

  const goalEntries: XpEntry[] = goalXpEvents.map((event) => ({
    completedAt: event.createdAt,
    amount: event.amount,
  }));

  return [...questEntries, ...goalEntries];
}

export function calculateOverallXP(completions: ReadonlyArray<QuestCompletion>, goalXpEvents: ReadonlyArray<XpEvent> = []) {
  return buildCombinedXpEntries(completions, goalXpEvents).reduce((total, entry) => total + entry.amount, 0);
}

export function calculateXPForRange(entries: ReadonlyArray<XpEntry>, start: Date, end: Date) {
  const startTime = start.getTime();
  const endTime = end.getTime();

  return entries.reduce((total, entry) => {
    const completedAt = new Date(entry.completedAt).getTime();

    if (completedAt >= startTime && completedAt <= endTime) {
      return total + entry.amount;
    }

    return total;
  }, 0);
}

export function calculateDailyXP(completions: ReadonlyArray<QuestCompletion>, goalXpEvents: ReadonlyArray<XpEvent> = [], referenceDate = new Date()) {
  const startOfDay = new Date(referenceDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  return calculateXPForRange(buildCombinedXpEntries(completions, goalXpEvents), startOfDay, endOfDay);
}

export function calculateWeeklyXP(completions: ReadonlyArray<QuestCompletion>, goalXpEvents: ReadonlyArray<XpEvent> = [], referenceDate = new Date()) {
  const startOfDay = new Date(referenceDate);
  startOfDay.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return calculateXPForRange(buildCombinedXpEntries(completions, goalXpEvents), startOfWeek, endOfWeek);
}

export function calculateCurrentStreak(completions: ReadonlyArray<QuestCompletion>, goalXpEvents: ReadonlyArray<XpEvent> = [], referenceDate = new Date()) {
  const completionDays = new Set(buildCombinedXpEntries(completions, goalXpEvents).map((entry) => getLocalDayKey(entry.completedAt)));
  const currentDate = new Date(referenceDate);
  currentDate.setHours(0, 0, 0, 0);

  let streak = 0;

  while (true) {
    const dayKey = getLocalDayKey(currentDate);

    if (!completionDays.has(dayKey)) {
      break;
    }

    streak += 1;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}

export function getCategoryProgression(
  categories: ReadonlyArray<Category>,
  quests: ReadonlyArray<Quest>,
  completions: ReadonlyArray<QuestCompletion>,
  goalXpEvents: ReadonlyArray<XpEvent> = [],
): CategoryProgression[] {
  const questById = new Map(quests.map((quest) => [quest.id, quest]));
  const xpByCategory = new Map<CategoryId, number>();

  completions.forEach((completion) => {
    const attributeRewardsAwarded = completion.attributeRewardsAwarded ?? [];

    if (attributeRewardsAwarded.length > 0) {
      attributeRewardsAwarded.forEach((reward) => {
        const currentXP = xpByCategory.get(reward.attributeId) ?? 0;
        xpByCategory.set(reward.attributeId, currentXP + reward.xp);
      });
      return;
    }

    const quest = questById.get(completion.questId);

    if (!quest) {
      return;
    }

    const currentXP = xpByCategory.get(quest.categoryId) ?? 0;
    xpByCategory.set(quest.categoryId, currentXP + completion.xpAwarded);
  });

  goalXpEvents.forEach((event) => {
    event.attributeXp.forEach((reward: XpEventAttributeReward) => {
      const currentXP = xpByCategory.get(reward.attributeId) ?? 0;
      xpByCategory.set(reward.attributeId, currentXP + reward.amount);
    });
  });

  return categories.map((category) => {
    const categoryXP = xpByCategory.get(category.id) ?? 0;
    const levelProgress = calculateLevel(categoryXP);

    return {
      ...category,
      level: levelProgress.currentLevel,
      xp: categoryXP,
      max: levelProgress.xpNeededForNextLevel,
      progress: levelProgress.progress,
      xpInCurrentLevel: levelProgress.xpInCurrentLevel,
      xpNeededForNextLevel: levelProgress.xpNeededForNextLevel,
    };
  });
}

export function getCategoryProgressionMap(
  categories: ReadonlyArray<Category>,
  quests: ReadonlyArray<Quest>,
  completions: ReadonlyArray<QuestCompletion>,
  goalXpEvents: ReadonlyArray<XpEvent> = [],
) {
  return Object.fromEntries(getCategoryProgression(categories, quests, completions, goalXpEvents).map((entry) => [entry.id, entry])) as Record<CategoryId, CategoryProgression>;
}

export function getProgressionSummary(
  categories: ReadonlyArray<Category>,
  quests: ReadonlyArray<Quest>,
  completions: ReadonlyArray<QuestCompletion>,
  goalXpEvents: ReadonlyArray<XpEvent> = [],
): ProgressionSummary {
  const totalXP = calculateOverallXP(completions, goalXpEvents);
  const levelProgress = calculateLevel(totalXP);
  const currentStreak = calculateCurrentStreak(completions, goalXpEvents);
  const dailyXP = calculateDailyXP(completions, goalXpEvents);
  const weeklyXP = calculateWeeklyXP(completions, goalXpEvents);
  const categoryProgression = getCategoryProgression(categories, quests, completions, goalXpEvents);
  const categoryProgressionMap = categories.reduce((acc, category) => {
    const progression = categoryProgression.find((entry) => entry.id === category.id);

    if (progression) {
      acc[category.id] = progression;
    }

    return acc;
  }, {} as Record<CategoryId, CategoryProgression>);

  return {
    totalXP,
    currentLevel: levelProgress.currentLevel,
    xpInCurrentLevel: levelProgress.xpInCurrentLevel,
    xpNeededForNextLevel: levelProgress.xpNeededForNextLevel,
    progress: levelProgress.progress,
    currentStreak,
    dailyXP,
    weeklyXP,
    completedQuests: completions.length,
    powerScore: Math.max(100, levelProgress.currentLevel * 120 + Math.floor(totalXP / 10)),
    categoryProgression,
    categoryProgressionMap,
  };
}
