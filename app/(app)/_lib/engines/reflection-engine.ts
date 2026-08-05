import { getLocalDayKey } from "../local-day";
import { REFLECTION_FEELING_SCORE, REFLECTION_MOOD_SCORE, type QuestReflection, type ReflectionHardest } from "../types/reflection";
import type { Quest } from "../types/quest";

function average(values: ReadonlyArray<number>): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function getAverageMoodScore(reflections: ReadonlyArray<QuestReflection>, questId?: string): number | null {
  const scoped = questId ? reflections.filter((reflection) => reflection.questId === questId) : reflections;
  return average(scoped.map((reflection) => REFLECTION_MOOD_SCORE[reflection.mood]));
}

export function getAverageFeelingAfterScore(reflections: ReadonlyArray<QuestReflection>, questId?: string): number | null {
  const scoped = questId ? reflections.filter((reflection) => reflection.questId === questId) : reflections;
  const scored = scoped.filter((reflection): reflection is QuestReflection & { feelingAfter: NonNullable<QuestReflection["feelingAfter"]> } => Boolean(reflection.feelingAfter));
  return average(scored.map((reflection) => REFLECTION_FEELING_SCORE[reflection.feelingAfter]));
}

const HARDEST_OPTIONS: ReadonlyArray<ReflectionHardest> = ["starting", "discipline", "time", "energy", "focus", "other"];

export function getHardestDistribution(reflections: ReadonlyArray<QuestReflection>): Record<ReflectionHardest, number> {
  const distribution = Object.fromEntries(HARDEST_OPTIONS.map((option) => [option, 0])) as Record<ReflectionHardest, number>;

  reflections.forEach((reflection) => {
    if (reflection.hardest) {
      distribution[reflection.hardest] += 1;
    }
  });

  return distribution;
}

export function getMoodTrend(reflections: ReadonlyArray<QuestReflection>, days: number, referenceDate = new Date()): number[] {
  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);
  const start = new Date(referenceDate);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const scoresByDay = new Map<string, number[]>();
  const orderedKeys: string[] = [];

  for (let index = 0; index < days; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = getLocalDayKey(date);
    orderedKeys.push(key);
    scoresByDay.set(key, []);
  }

  reflections.forEach((reflection) => {
    const time = new Date(reflection.createdAt).getTime();

    if (time < start.getTime() || time > end.getTime()) {
      return;
    }

    const key = getLocalDayKey(reflection.createdAt);
    scoresByDay.get(key)?.push(REFLECTION_MOOD_SCORE[reflection.mood]);
  });

  return orderedKeys.map((key) => average(scoresByDay.get(key) ?? []) ?? 0);
}

export type QuestMoodRanking = Readonly<{ questId: string; title: string; averageMood: number; sampleSize: number }>;

export function getQuestsRankedByAverageMood(reflections: ReadonlyArray<QuestReflection>, questDefinitions: ReadonlyArray<Quest>): QuestMoodRanking[] {
  const questById = new Map(questDefinitions.map((quest) => [quest.id, quest]));
  const scoresByQuest = new Map<string, number[]>();

  reflections.forEach((reflection) => {
    const list = scoresByQuest.get(reflection.questId) ?? [];
    list.push(REFLECTION_MOOD_SCORE[reflection.mood]);
    scoresByQuest.set(reflection.questId, list);
  });

  return Array.from(scoresByQuest.entries())
    .map(([questId, scores]) => ({
      questId,
      title: questById.get(questId)?.title ?? "Unknown quest",
      averageMood: average(scores) ?? 0,
      sampleSize: scores.length,
    }))
    .sort((a, b) => b.averageMood - a.averageMood);
}

export function getReflectionHistory(reflections: ReadonlyArray<QuestReflection>, questId?: string, limit = 20): QuestReflection[] {
  const scoped = questId ? reflections.filter((reflection) => reflection.questId === questId) : reflections;
  return [...scoped].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
}
