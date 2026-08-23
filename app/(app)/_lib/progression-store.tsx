"use client";

import { createContext, useCallback, useEffect, useMemo, useRef } from "react";
import { useAttributes } from "./hooks/useAttributes";
import { useGoalTree } from "./hooks/useGoalTree";
import { useLocalStorageState } from "./hooks/use-local-storage-state";
import { STORAGE_KEYS } from "./storage-keys";
import { addActivityEvents, createQuestActivityEvents, removeActivityEventsByCompletionId } from "./activity-events";
import { isQuestScheduledForDate, calculateQuestStreak } from "./daily-system";
import { deriveChallengeProgress } from "./engines/challenge-engine";
import { getProgressionSummary } from "./engines/progression-engine";
import { getLocalDayKey } from "./local-day";
import { createQuestCompletion, hasCompletedToday, normalizeQuestList, removeQuestCompletionsForDay } from "./quest-storage";
import type { ProgressionSummary } from "./engines/progression-engine";
import type { Quest, QuestCompletion, QuestAttributeReward, QuestGoalContribution } from "./types/quest";
import type { XpEvent } from "./types/progression";
import type { DailySnapshot } from "./types/daily-system";
import type { ActivityEvent } from "./types/activity-event";

// Compares Challenge progress just before vs. just after a trial completion
// (challengeBonusXp = 0) to see whether this completion clears a level. The
// level that was just cleared is `before.currentLevelIndex` - its configured
// xp is the bonus, baked into the real completion so it's undo-symmetric
// (removing the completion removes the bonus, same as streakBonusXp).
function computeChallengeBonusXp(
  quest: Quest,
  currentCompletions: ReadonlyArray<QuestCompletion>,
  completedAt: string,
  attributeRewardsAwarded: ReadonlyArray<QuestAttributeReward>,
  previousStreak: number,
  metricValue: number | undefined,
  goalContribution: QuestGoalContribution | null | undefined,
  referenceDate: Date,
): number {
  if (!quest.challenge?.enabled) {
    return 0;
  }

  const trial = createQuestCompletion(quest, completedAt, attributeRewardsAwarded, previousStreak + 1, metricValue, goalContribution, 0);
  const before = deriveChallengeProgress(quest, currentCompletions, referenceDate);
  const after = deriveChallengeProgress(quest, [...currentCompletions, trial], referenceDate);

  if (!before || !after || after.currentLevelIndex <= before.currentLevelIndex) {
    return 0;
  }

  return Math.max(0, Math.floor(Number(quest.challenge.levels[before.currentLevelIndex]?.xp) || 0));
}

// Dedup-append by id, mirrors addActivityEvents.
function addXpEvents(current: ReadonlyArray<XpEvent>, next: ReadonlyArray<XpEvent>): XpEvent[] {
  const byId = new Map<string, XpEvent>();

  for (const event of [...current, ...next]) {
    byId.set(event.id, event);
  }

  return Array.from(byId.values());
}

export type ProgressionStoreValue = Readonly<{
  isReady: boolean;
  questDefinitions: Quest[];
  questCompletions: QuestCompletion[];
  goalXpEvents: ReadonlyArray<XpEvent>;
  bonusXpEvents: ReadonlyArray<XpEvent>;
  // goalXpEvents + bonusXpEvents, already merged - the same combined array
  // progressionSummary is computed from, exposed so consumers that need the
  // raw events (e.g. chronicle-engine.ts) don't have to re-merge themselves.
  combinedXpEvents: ReadonlyArray<XpEvent>;
  activityEvents: ActivityEvent[];
  dailySnapshots: DailySnapshot[];
  progressionSummary: ProgressionSummary;
  setQuestDefinitions: (next: Quest[] | ((current: Quest[]) => Quest[])) => void;
  setQuestCompletions: (next: QuestCompletion[] | ((current: QuestCompletion[]) => QuestCompletion[])) => void;
  setActivityEvents: (next: ActivityEvent[] | ((current: ActivityEvent[]) => ActivityEvent[])) => void;
  addActivityEvents: (events: ReadonlyArray<ActivityEvent>) => void;
  addBonusXpEvents: (events: ReadonlyArray<XpEvent>) => void;
  setDailySnapshots: (next: DailySnapshot[] | ((current: DailySnapshot[]) => DailySnapshot[])) => void;
  completeQuest: (questId: string, completedAt?: string, attributeRewardsAwarded?: ReadonlyArray<QuestAttributeReward>) => boolean;
  setQuestCompletionForToday: (
    questId: string,
    completed: boolean,
    completedAt?: string,
    attributeRewardsAwarded?: ReadonlyArray<QuestAttributeReward>,
    metricValue?: number,
    goalContribution?: QuestGoalContribution | null,
  ) => boolean;
  clearQuestCompletionsForDay: (referenceDate?: Date) => void;
  hasQuestCompletedToday: (questId: string, referenceDate?: Date) => boolean;
}>;

export const ProgressionContext = createContext<ProgressionStoreValue | null>(null);

export function ProgressionProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { goalXpEvents } = useGoalTree();
  const { attributes: categories } = useAttributes();
  const [rawQuestDefinitions, setQuestDefinitions, hasQuestDefinitionsLoaded] = useLocalStorageState<Quest[]>(STORAGE_KEYS.questList, []);
  const [questCompletions, setQuestCompletions, hasQuestCompletionsLoaded] = useLocalStorageState<QuestCompletion[]>(STORAGE_KEYS.questCompletions, []);
  const [activityEvents, setActivityEvents, hasActivityEventsLoaded] = useLocalStorageState<ActivityEvent[]>(STORAGE_KEYS.activityEvents, []);
  const [dailySnapshots, setDailySnapshots, hasDailySnapshotsLoaded] = useLocalStorageState<DailySnapshot[]>(STORAGE_KEYS.dailySnapshots, []);
  const [bonusXpEvents, setBonusXpEvents, hasBonusXpEventsLoaded] = useLocalStorageState<XpEvent[]>(STORAGE_KEYS.bonusXpEvents, []);
  // Every reader below (real XP awarded on completion, daily XP goal,
  // Quest Mastery) goes through this normalized view, not the raw storage
  // value - a legacy/corrupted quest.xp is fixed here once, for everyone,
  // instead of every individual consumer needing its own defensive check.
  // See quest-storage.ts::normalizeQuestList for what "invalid" means and
  // why (this is the root-cause fix for the "Level NaN" mastery bug).
  const questDefinitions = useMemo(() => normalizeQuestList(rawQuestDefinitions), [rawQuestDefinitions]);
  const questDefinitionsRef = useRef(questDefinitions);
  const questCompletionsRef = useRef(questCompletions);

  useEffect(() => {
    questDefinitionsRef.current = questDefinitions;
  }, [questDefinitions]);

  // Self-heal the actual persisted data once real corruption is detected,
  // mirroring the same "detect drift, correct once" pattern already used
  // for the Goal Tree (commitGoalTree/normalizeGoalTree). Only ever rewrites
  // the specific invalid field(s) - never touches completions, streaks, or
  // any other quest data.
  useEffect(() => {
    if (!hasQuestDefinitionsLoaded || questDefinitions === rawQuestDefinitions) {
      return;
    }

    setQuestDefinitions(questDefinitions);
  }, [hasQuestDefinitionsLoaded, questDefinitions, rawQuestDefinitions, setQuestDefinitions]);

  useEffect(() => {
    questCompletionsRef.current = questCompletions;
  }, [questCompletions]);

  const combinedXpEvents = useMemo(() => [...goalXpEvents, ...bonusXpEvents], [goalXpEvents, bonusXpEvents]);

  const progressionSummary = useMemo(
    () => getProgressionSummary(categories, questDefinitions, questCompletions, combinedXpEvents),
    [categories, combinedXpEvents, questDefinitions, questCompletions],
  );

  const appendActivityEvents = useCallback(
    (events: ReadonlyArray<ActivityEvent>) => {
      setActivityEvents((current) => addActivityEvents(current, events));
    },
    [setActivityEvents],
  );

  const addBonusXpEvents = useCallback(
    (events: ReadonlyArray<XpEvent>) => {
      if (events.length === 0) {
        return;
      }

      setBonusXpEvents((current) => addXpEvents(current, events));
    },
    [setBonusXpEvents],
  );

  const setQuestCompletionForToday = useCallback(
    (
      questId: string,
      completed: boolean,
      completedAt = new Date().toISOString(),
      attributeRewardsAwarded: ReadonlyArray<QuestAttributeReward> = [],
      metricValue?: number,
      goalContribution?: QuestGoalContribution | null,
    ) => {
      const quest = questDefinitionsRef.current.find((item) => item.id === questId);

      if (!quest) {
        return false;
      }

      const referenceDate = new Date(completedAt);
      if (completed && !isQuestScheduledForDate(quest, referenceDate)) {
        return false;
      }

      const currentCompletions = questCompletionsRef.current;

      if (completed) {
        if (hasCompletedToday(questId, currentCompletions, referenceDate)) {
          return false;
        }

        const previousStreak = calculateQuestStreak(quest, currentCompletions, referenceDate);
        const challengeBonusXp = computeChallengeBonusXp(
          quest,
          currentCompletions,
          completedAt,
          attributeRewardsAwarded,
          previousStreak,
          metricValue,
          goalContribution,
          referenceDate,
        );
        const completion = createQuestCompletion(quest, completedAt, attributeRewardsAwarded, previousStreak + 1, metricValue, goalContribution, challengeBonusXp);
        const nextCompletions = [...currentCompletions, completion];
        questCompletionsRef.current = nextCompletions;
        setQuestCompletions(nextCompletions);
        appendActivityEvents(createQuestActivityEvents(quest, completion, completion.attributeRewardsAwarded));
        return true;
      }

      if (!hasCompletedToday(questId, currentCompletions, referenceDate)) {
        return false;
      }

      const dayKey = getLocalDayKey(completedAt);
      const removedCompletions = currentCompletions.filter((completion) => completion.questId === questId && getLocalDayKey(completion.completedAt) === dayKey);
      const nextCompletions = currentCompletions.filter((completion) => !(completion.questId === questId && getLocalDayKey(completion.completedAt) === dayKey));
      questCompletionsRef.current = nextCompletions;
      setQuestCompletions(nextCompletions);
      setActivityEvents((current) => removedCompletions.reduce((events, completion) => removeActivityEventsByCompletionId(events, completion.id), current));
      return true;
    },
    [appendActivityEvents, setActivityEvents, setQuestCompletions],
  );

  const completeQuest = useCallback(
    (questId: string, completedAt = new Date().toISOString(), attributeRewardsAwarded: ReadonlyArray<QuestAttributeReward> = []) => {
      return setQuestCompletionForToday(questId, true, completedAt, attributeRewardsAwarded);
    },
    [setQuestCompletionForToday],
  );

  const clearQuestCompletionsForDay = useCallback(
    (referenceDate = new Date()) => {
      const nextCompletions = removeQuestCompletionsForDay(questCompletionsRef.current, referenceDate);
      const removedCompletionIds = questCompletionsRef.current.filter((completion) => !nextCompletions.some((nextCompletion) => nextCompletion.id === completion.id)).map((completion) => completion.id);
      questCompletionsRef.current = nextCompletions;
      setQuestCompletions(nextCompletions);
      setActivityEvents((current) => removedCompletionIds.reduce((events, completionId) => removeActivityEventsByCompletionId(events, completionId), current));
    },
    [setActivityEvents, setQuestCompletions],
  );

  const hasQuestCompletedToday = useCallback(
    (questId: string, referenceDate = new Date()) => hasCompletedToday(questId, questCompletionsRef.current, referenceDate),
    [],
  );

  const value = useMemo(
    (): ProgressionStoreValue => ({
      isReady: hasQuestDefinitionsLoaded && hasQuestCompletionsLoaded && hasDailySnapshotsLoaded && hasActivityEventsLoaded && hasBonusXpEventsLoaded,
      questDefinitions,
      questCompletions,
      goalXpEvents,
      bonusXpEvents,
      combinedXpEvents,
      activityEvents,
      dailySnapshots,
      progressionSummary,
      setQuestDefinitions,
      setQuestCompletions,
      setActivityEvents,
      addActivityEvents: appendActivityEvents,
      addBonusXpEvents,
      setDailySnapshots,
      completeQuest,
      setQuestCompletionForToday,
      clearQuestCompletionsForDay,
      hasQuestCompletedToday,
    }),
    [
      completeQuest,
      clearQuestCompletionsForDay,
      hasActivityEventsLoaded,
      hasBonusXpEventsLoaded,
      dailySnapshots,
      activityEvents,
      bonusXpEvents,
      hasQuestCompletionsLoaded,
      hasDailySnapshotsLoaded,
      hasQuestDefinitionsLoaded,
      hasQuestCompletedToday,
      goalXpEvents,
      bonusXpEvents,
      combinedXpEvents,
      progressionSummary,
      questCompletions,
      questDefinitions,
      appendActivityEvents,
      addBonusXpEvents,
      setQuestCompletionForToday,
      setQuestCompletions,
      setActivityEvents,
      setDailySnapshots,
      setQuestDefinitions,
    ],
  );

  return <ProgressionContext.Provider value={value}>{children}</ProgressionContext.Provider>;
}
