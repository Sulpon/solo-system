import { getLocalDayKey, parseLocalDayKey } from "./local-day";
import type { DailySnapshot, DailySnapshotAttributeXp } from "./types/daily-system";
import type { XpEvent } from "./types/progression";
import type { Quest, QuestCompletion } from "./types/quest";

export function isQuestScheduledForDate(quest: Pick<Quest, "scheduledDays">, referenceDate = new Date()) {
  const scheduledDays = quest.scheduledDays ?? [];

  if (scheduledDays.length === 0) {
    return true;
  }

  return scheduledDays.includes(referenceDate.getDay());
}

export function getTodayQuests(quests: ReadonlyArray<Quest>, referenceDate = new Date()) {
  return quests.filter((quest) => {
    if (quest.status !== "active") {
      return false;
    }

    return quest.cadence === "daily" && isQuestScheduledForDate(quest, referenceDate);
  });
}

export function getCoreQuests(quests: ReadonlyArray<Quest>) {
  return quests.filter((quest) => (quest.importance ?? "core") === "core");
}

export function getBonusQuests(quests: ReadonlyArray<Quest>) {
  return quests.filter((quest) => (quest.importance ?? "core") === "bonus");
}

export function getCompletionsForDay(completions: ReadonlyArray<QuestCompletion>, referenceDate = new Date()) {
  const dayKey = getLocalDayKey(referenceDate);
  return completions.filter((completion) => getLocalDayKey(completion.completedAt) === dayKey);
}

export function getCompletedQuestIdsForDay(completions: ReadonlyArray<QuestCompletion>, referenceDate = new Date()) {
  return new Set(getCompletionsForDay(completions, referenceDate).map((completion) => completion.questId));
}

export function calculateDailySuccess(coreQuests: ReadonlyArray<Quest>, completedQuestIds: ReadonlySet<string>) {
  if (coreQuests.length === 0) {
    return 0;
  }

  const completedCount = coreQuests.filter((quest) => completedQuestIds.has(quest.id)).length;
  return Math.round((completedCount / coreQuests.length) * 100);
}

export function getTodayXpEvents(goalXpEvents: ReadonlyArray<XpEvent>, referenceDate = new Date()) {
  const dayKey = getLocalDayKey(referenceDate);
  return goalXpEvents.filter((event) => getLocalDayKey(event.createdAt) === dayKey);
}

export function getAttributeXpForDay(completions: ReadonlyArray<QuestCompletion>, goalXpEvents: ReadonlyArray<XpEvent>, referenceDate = new Date()) {
  const attributeXp = new Map<string, number>();

  getCompletionsForDay(completions, referenceDate).forEach((completion) => {
    (completion.attributeRewardsAwarded ?? []).forEach((reward) => {
      attributeXp.set(reward.attributeId, (attributeXp.get(reward.attributeId) ?? 0) + reward.xp);
    });
  });

  getTodayXpEvents(goalXpEvents, referenceDate).forEach((event) => {
    event.attributeXp.forEach((reward) => {
      attributeXp.set(reward.attributeId, (attributeXp.get(reward.attributeId) ?? 0) + reward.amount);
    });
  });

  return Array.from(attributeXp.entries()).map(
    ([attributeId, amount]): DailySnapshotAttributeXp => ({
      attributeId: attributeId as DailySnapshotAttributeXp["attributeId"],
      amount,
    }),
  );
}

export function createDailySnapshot({
  quests,
  completions,
  goalXpEvents,
  referenceDate = new Date(),
  existingSnapshot,
}: Readonly<{
  quests: ReadonlyArray<Quest>;
  completions: ReadonlyArray<QuestCompletion>;
  goalXpEvents: ReadonlyArray<XpEvent>;
  referenceDate?: Date;
  existingSnapshot?: DailySnapshot | null;
}>): DailySnapshot {
  const date = getLocalDayKey(referenceDate);
  const todayQuests = getTodayQuests(quests, referenceDate);
  const coreQuests = getCoreQuests(todayQuests);
  const bonusQuests = getBonusQuests(todayQuests);
  const todayCompletions = getCompletionsForDay(completions, referenceDate);
  const completedQuestIds = new Set(todayCompletions.map((completion) => completion.questId));
  const todayGoalEvents = getTodayXpEvents(goalXpEvents, referenceDate);
  const now = new Date().toISOString();

  return {
    id: existingSnapshot?.id ?? `daily-${date}`,
    date,
    coreQuestIds: coreQuests.map((quest) => quest.id),
    completedCoreQuestIds: coreQuests.filter((quest) => completedQuestIds.has(quest.id)).map((quest) => quest.id),
    bonusQuestIds: bonusQuests.map((quest) => quest.id),
    completedBonusQuestIds: bonusQuests.filter((quest) => completedQuestIds.has(quest.id)).map((quest) => quest.id),
    questXpEarned: todayCompletions.reduce((total, completion) => total + completion.xpAwarded, 0),
    attributeXpEarned: getAttributeXpForDay(completions, goalXpEvents, referenceDate),
    completedGoalNodeIds: todayGoalEvents.map((event) => event.sourceId),
    progressGoalUpdates: todayCompletions
      .map((completion) => {
        const quest = quests.find((item) => item.id === completion.questId);
        return quest?.linkedProgressGoalId ? { progressGoalId: quest.linkedProgressGoalId, questId: quest.id } : null;
      })
      .filter((update): update is { progressGoalId: string; questId: string } => Boolean(update)),
    dailySuccessPercent: calculateDailySuccess(coreQuests, completedQuestIds),
    reviewed: true,
    reflectionNote: existingSnapshot?.reflectionNote,
    createdAt: existingSnapshot?.createdAt ?? now,
    updatedAt: now,
  };
}

export function getConsistencyScore(snapshots: ReadonlyArray<DailySnapshot>, referenceDate = new Date()) {
  const end = new Date(referenceDate);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 29);

  const recent = snapshots.filter((snapshot) => {
    const date = parseLocalDayKey(snapshot.date);
    return date >= start && date <= end;
  });

  if (recent.length === 0) {
    return null;
  }

  return Math.round(recent.reduce((total, snapshot) => total + snapshot.dailySuccessPercent, 0) / recent.length);
}
