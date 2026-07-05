import { getLocalDayKey } from "./local-day";
import type { Quest, QuestCompletion, QuestAttributeReward } from "./types/quest";

export function createQuestCompletion(
  quest: Quest,
  completedAt = new Date().toISOString(),
  attributeRewardsAwarded: ReadonlyArray<QuestAttributeReward> = quest.attributeXPOverride ?? [],
): QuestCompletion {
  return {
    id: `${quest.id}-${completedAt}`,
    questId: quest.id,
    completedAt,
    xpAwarded: quest.xp,
    attributeRewardsAwarded: attributeRewardsAwarded.map((reward) => ({
      attributeId: reward.attributeId,
      xp: Math.max(0, Math.floor(Number(reward.xp) || 0)),
    })) ?? [],
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
