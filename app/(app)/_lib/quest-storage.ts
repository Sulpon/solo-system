import { getLocalDayKey } from "./local-day";
import { calculateStreakXpBonus } from "./daily-system";
import { DEFAULT_QUEST_MASTERY_MULTIPLIER } from "./engines/quest-mastery-engine";
import type { Quest, QuestCompletion, QuestAttributeReward, QuestGoalContribution } from "./types/quest";

// A quest record whose xp (or masteryMultiplier) is missing/invalid - a
// legacy record from before validation existed, or corrupted by some other
// path - breaks every calculation that reads it raw: real XP awarded on
// completion here, the daily XP goal total, Quest Mastery level. Sanitizing
// once at the single point every consumer reads through (see
// progression-store.tsx) fixes all of them at once, without touching
// completions/streak history or any other field. Never invents a plausible
// non-zero amount - 0 honestly means "not configured," visible in the Edit
// Quest form so the user can set a real value.
export function normalizeQuest(quest: Quest): Quest {
  const safeXp = Number.isFinite(quest.xp) ? quest.xp : Math.max(0, Math.floor(Number(quest.xp) || 0));
  const safeMasteryMultiplier =
    quest.masteryMultiplier === undefined
      ? undefined
      : Number.isFinite(quest.masteryMultiplier)
        ? quest.masteryMultiplier
        : DEFAULT_QUEST_MASTERY_MULTIPLIER;

  if (safeXp === quest.xp && safeMasteryMultiplier === quest.masteryMultiplier) {
    return quest;
  }

  return { ...quest, xp: safeXp, masteryMultiplier: safeMasteryMultiplier };
}

// Returns the same array reference when nothing needed fixing, so callers
// (e.g. a useMemo keyed on this) don't churn on every render.
export function normalizeQuestList(quests: ReadonlyArray<Quest>): Quest[] {
  let changed = false;
  const next = quests.map((quest) => {
    const normalized = normalizeQuest(quest);
    if (normalized !== quest) changed = true;
    return normalized;
  });

  return changed ? next : (quests as Quest[]);
}

export function createQuestCompletion(
  quest: Quest,
  completedAt = new Date().toISOString(),
  attributeRewardsAwarded: ReadonlyArray<QuestAttributeReward> = quest.attributeXPOverride ?? [],
  streakDays = 1,
  metricValue?: number,
  goalContribution?: QuestGoalContribution | null,
  challengeBonusXp = 0,
): QuestCompletion {
  // Defensive - by the time this runs, `quest` should already be a
  // normalized record (see normalizeQuestList above), but this is the one
  // function that turns quest.xp into a real, persisted XP award, so it
  // never trusts its input blindly.
  const safeXp = Number.isFinite(quest.xp) ? quest.xp : Math.max(0, Math.floor(Number(quest.xp) || 0));
  const streakBonusXp = calculateStreakXpBonus(safeXp, streakDays);

  return {
    id: `${quest.id}-${completedAt}`,
    questId: quest.id,
    completedAt,
    xpAwarded: safeXp + streakBonusXp + challengeBonusXp,
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
