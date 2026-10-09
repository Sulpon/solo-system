import { getLocalDayKey } from "../local-day";
import { eachDayKeyInclusive } from "./challenge-mission-engine";
import type { Challenge, ChallengeMetric } from "../types/challenge";
import type { QuestCompletion } from "../types/quest";

// Deriving Challenge day-logs from real Quest completions.
//
// Shaped after useGoalMetricSync: the answer is always recomputed from the
// underlying records rather than written once at completion time. That is
// what makes un-completing a Quest clear the day again, and a back-dated or
// deleted completion correct itself, with no undo path of its own.
//
// Only boolean metrics participate. A Quest completion says "this happened
// today" and nothing more - it has no number, rating, text or photo in it,
// so filling any other metric type from one would be inventing data.
//
// Only ACTIVE challenges are written to. A completed or abandoned
// challenge is history; silently editing its log because an old Quest was
// ticked afterwards would rewrite the past.

export const QUEST_LINKED_ENTRY_SOURCE = "quest" as const;

// The value a linked boolean metric gets for a day that was completed.
// Matches what ChallengeTracker writes for a boolean metric by hand, so a
// derived day and a hand-logged day are indistinguishable to every reader.
export const QUEST_LINKED_ENTRY_VALUE = 1;

export type QuestLinkedEntryKey = Readonly<{
  challengeId: string;
  metricId: string;
  date: string;
}>;

export function isQuestLinkableMetric(metric: ChallengeMetric): boolean {
  return metric.type === "boolean";
}

// Every (metric, day) pair that SHOULD be logged right now, given the real
// completions. Pure - the caller diffs this against stored entries.
export function computeQuestLinkedEntries(
  input: Readonly<{
    challenges: ReadonlyArray<Challenge>;
    metrics: ReadonlyArray<ChallengeMetric>;
    questCompletions: ReadonlyArray<QuestCompletion>;
    today?: Date;
  }>,
): QuestLinkedEntryKey[] {
  const todayKey = getLocalDayKey(input.today ?? new Date());
  const activeChallenges = new Map(input.challenges.filter((challenge) => challenge.status === "active").map((challenge) => [challenge.id, challenge]));

  // Completion day-keys per quest, built once - a long history would
  // otherwise be rescanned for every metric and every day.
  const completedDaysByQuest = new Map<string, Set<string>>();
  for (const completion of input.questCompletions) {
    const days = completedDaysByQuest.get(completion.questId) ?? new Set<string>();
    days.add(getLocalDayKey(completion.completedAt));
    completedDaysByQuest.set(completion.questId, days);
  }

  const desired: QuestLinkedEntryKey[] = [];

  for (const metric of input.metrics) {
    if (!metric.linkedQuestId || !isQuestLinkableMetric(metric)) continue;

    const challenge = activeChallenges.get(metric.challengeId);
    if (!challenge) continue;

    const completedDays = completedDaysByQuest.get(metric.linkedQuestId);
    if (!completedDays || completedDays.size === 0) continue;

    // Never past today: a challenge running into the future must not
    // pre-fill days that have not happened.
    const lastDay = challenge.endDate < todayKey ? challenge.endDate : todayKey;
    if (lastDay < challenge.startDate) continue;

    for (const dayKey of eachDayKeyInclusive(challenge.startDate, lastDay)) {
      if (completedDays.has(dayKey)) {
        desired.push({ challengeId: challenge.id, metricId: metric.id, date: dayKey });
      }
    }
  }

  return desired;
}

// Which metrics the sync is allowed to touch. Anything outside this set -
// including a metric whose link was just removed - is left exactly as the
// user left it, so unlinking never deletes days that were already logged.
export function getQuestLinkedMetricIds(metrics: ReadonlyArray<ChallengeMetric>): Set<string> {
  return new Set(metrics.filter((metric) => metric.linkedQuestId && isQuestLinkableMetric(metric)).map((metric) => metric.id));
}

export function entryKey(key: QuestLinkedEntryKey): string {
  return `${key.challengeId}|${key.metricId}|${key.date}`;
}
