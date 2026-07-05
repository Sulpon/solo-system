"use client";

import { createContext, useCallback, useEffect, useMemo, useRef } from "react";
import { useGoalTree } from "./hooks/useGoalTree";
import { useLocalStorageState } from "./hooks/use-local-storage-state";
import { categories } from "./mock/categories";
import { STORAGE_KEYS } from "./storage-keys";
import { addActivityEvents, createQuestActivityEvents, removeActivityEventsByCompletionId } from "./activity-events";
import { isQuestScheduledForDate } from "./daily-system";
import { getProgressionSummary } from "./engines/progression-engine";
import { getLocalDayKey } from "./local-day";
import { createQuestCompletion, hasCompletedToday, removeQuestCompletionsForDay } from "./quest-storage";
import type { ProgressionSummary } from "./engines/progression-engine";
import type { Quest, QuestCompletion, QuestAttributeReward } from "./types/quest";
import type { XpEvent } from "./types/progression";
import type { DailySnapshot } from "./types/daily-system";
import type { ActivityEvent } from "./types/activity-event";

export type ProgressionStoreValue = Readonly<{
  isReady: boolean;
  questDefinitions: Quest[];
  questCompletions: QuestCompletion[];
  goalXpEvents: ReadonlyArray<XpEvent>;
  activityEvents: ActivityEvent[];
  dailySnapshots: DailySnapshot[];
  progressionSummary: ProgressionSummary;
  setQuestDefinitions: (next: Quest[] | ((current: Quest[]) => Quest[])) => void;
  setQuestCompletions: (next: QuestCompletion[] | ((current: QuestCompletion[]) => QuestCompletion[])) => void;
  setActivityEvents: (next: ActivityEvent[] | ((current: ActivityEvent[]) => ActivityEvent[])) => void;
  addActivityEvents: (events: ReadonlyArray<ActivityEvent>) => void;
  setDailySnapshots: (next: DailySnapshot[] | ((current: DailySnapshot[]) => DailySnapshot[])) => void;
  completeQuest: (questId: string, completedAt?: string, attributeRewardsAwarded?: ReadonlyArray<QuestAttributeReward>) => boolean;
  setQuestCompletionForToday: (questId: string, completed: boolean, completedAt?: string, attributeRewardsAwarded?: ReadonlyArray<QuestAttributeReward>) => boolean;
  clearQuestCompletionsForDay: (referenceDate?: Date) => void;
  hasQuestCompletedToday: (questId: string, referenceDate?: Date) => boolean;
}>;

export const ProgressionContext = createContext<ProgressionStoreValue | null>(null);

export function ProgressionProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { goalXpEvents } = useGoalTree();
  const [questDefinitions, setQuestDefinitions, hasQuestDefinitionsLoaded] = useLocalStorageState<Quest[]>(STORAGE_KEYS.questList, []);
  const [questCompletions, setQuestCompletions, hasQuestCompletionsLoaded] = useLocalStorageState<QuestCompletion[]>(STORAGE_KEYS.questCompletions, []);
  const [activityEvents, setActivityEvents, hasActivityEventsLoaded] = useLocalStorageState<ActivityEvent[]>(STORAGE_KEYS.activityEvents, []);
  const [dailySnapshots, setDailySnapshots, hasDailySnapshotsLoaded] = useLocalStorageState<DailySnapshot[]>(STORAGE_KEYS.dailySnapshots, []);
  const questDefinitionsRef = useRef(questDefinitions);
  const questCompletionsRef = useRef(questCompletions);

  useEffect(() => {
    questDefinitionsRef.current = questDefinitions;
  }, [questDefinitions]);

  useEffect(() => {
    questCompletionsRef.current = questCompletions;
  }, [questCompletions]);

  const progressionSummary = useMemo(
    () => getProgressionSummary(categories, questDefinitions, questCompletions, goalXpEvents),
    [goalXpEvents, questDefinitions, questCompletions],
  );

  const appendActivityEvents = useCallback(
    (events: ReadonlyArray<ActivityEvent>) => {
      setActivityEvents((current) => addActivityEvents(current, events));
    },
    [setActivityEvents],
  );

  const setQuestCompletionForToday = useCallback(
    (questId: string, completed: boolean, completedAt = new Date().toISOString(), attributeRewardsAwarded: ReadonlyArray<QuestAttributeReward> = []) => {
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

        const completion = createQuestCompletion(quest, completedAt, attributeRewardsAwarded);
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
      isReady: hasQuestDefinitionsLoaded && hasQuestCompletionsLoaded && hasDailySnapshotsLoaded && hasActivityEventsLoaded,
      questDefinitions,
      questCompletions,
      goalXpEvents,
      activityEvents,
      dailySnapshots,
      progressionSummary,
      setQuestDefinitions,
      setQuestCompletions,
      setActivityEvents,
      addActivityEvents: appendActivityEvents,
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
      dailySnapshots,
      activityEvents,
      hasQuestCompletionsLoaded,
      hasDailySnapshotsLoaded,
      hasQuestDefinitionsLoaded,
      hasQuestCompletedToday,
      goalXpEvents,
      progressionSummary,
      questCompletions,
      questDefinitions,
      appendActivityEvents,
      setQuestCompletionForToday,
      setQuestCompletions,
      setActivityEvents,
      setDailySnapshots,
      setQuestDefinitions,
    ],
  );

  return <ProgressionContext.Provider value={value}>{children}</ProgressionContext.Provider>;
}
