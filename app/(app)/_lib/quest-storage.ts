import { getLocalDayKey } from "./local-day";
import { calculateStreakXpBonus } from "./daily-system";
import type { Quest, QuestCompletion, QuestAttributeReward, QuestGoalContribution } from "./types/quest";

export function createQuestCompletion(
  quest: Quest,
  completedAt = new Date().toISOString(),
  attributeRewardsAwarded: ReadonlyArray<QuestAttributeReward> = quest.attributeXPOverride ?? [],
  streakDays = 1,
  metricValue?: number,
  goalContribution?: QuestGoalContribution | null,
  challengeBonusXp = 0,
): QuestCompletion {
  const streakBonusXp = calculateStreakXpBonus(quest.xp, streakDays);

  return {
    id: `${quest.id}-${completedAt}`,
    questId: quest.id,
    completedAt,
    xpAwarded: quest.xp + streakBonusXp + challengeBonusXp,
    streakBonusXp,
    challengeBonusXp,
    attributeRewardsAwarded: attributeRewardsAwarded.map((reward) => ({
      attributeId: reward.attributeId,
      xp: Math.max(0, Math.floor(Number(reward.xp) || 0)),
    })) ?? [],
    metricValue,
    goalContribution: goalContribution ?? null,
  };
}

export function hasCompletedToday(questId: string, completions: ReadonlyArray<QuestCompletion>, referenceDate = new Date()) {
  const dayKey = getLocalDayKey(referenceDate);

  return completions.some((completion) => completion.questId === questId && getLocalDayKey(completion.completedAt) === dayKey);
}

export function removeQuestCompletionsForDay(completions: ReadonlyArray<QuestCompletion>, referenceDate = new Date()) {
  const dayKey = getLocalDayKey(referenceDate);

  return completions.filter((completion) => getLocalDayKey(completion.completedAt) !== dayKey);
}
