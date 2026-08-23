"use client";

import { useMemo } from "react";
import { useProgression } from "./useProgression";
import { useAttributes } from "./useAttributes";
import { useWorkoutSessions } from "./useWorkoutSessions";
import { useRewardCollection } from "./useRewardCollection";
import { useJournalEntries } from "./useJournalEntries";
import type { ChronicleContext } from "../engines/chronicle-engine";

// Assembles the same read-only bundle every Chronicle view needs, from
// hooks/stores that already exist elsewhere in the app - nothing here reads
// or writes any storage of its own except journalEntries.
export function useChronicleContext() {
  const { isReady: progressionReady, questDefinitions, questCompletions, combinedXpEvents, activityEvents, dailySnapshots } = useProgression();
  const { attributes, hasLoaded: attributesLoaded } = useAttributes();
  const { sessions: workoutSessions, hasLoaded: workoutsLoaded } = useWorkoutSessions();
  const { rewardCollection, hasLoaded: rewardsLoaded } = useRewardCollection();
  const { entries: journalEntries, hasLoaded: journalLoaded, upsertEntryForDate, deleteEntry, getEntryForDate } = useJournalEntries();

  const isReady = progressionReady && attributesLoaded && workoutsLoaded && rewardsLoaded && journalLoaded;

  const context: ChronicleContext = useMemo(
    () => ({
      quests: questDefinitions,
      completions: questCompletions,
      xpEvents: combinedXpEvents,
      activityEvents,
      workoutSessions,
      rewardCollection,
      dailySnapshots,
      journalEntries,
      categories: attributes,
    }),
    [questDefinitions, questCompletions, combinedXpEvents, activityEvents, workoutSessions, rewardCollection, dailySnapshots, journalEntries, attributes],
  );

  return { isReady, context, upsertEntryForDate, deleteEntry, getEntryForDate } as const;
}
