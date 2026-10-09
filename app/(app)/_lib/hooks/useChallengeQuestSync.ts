"use client";

import { useEffect } from "react";
import { useChallenges } from "./useChallenges";
import { useChallengeMetrics } from "./useChallengeMetrics";
import { useChallengeEntries } from "./useChallengeEntries";
import { useProgression } from "./useProgression";
import { computeQuestLinkedEntries, getQuestLinkedMetricIds } from "../engines/challenge-quest-sync";

// Keeps every quest-linked Challenge metric's day-log mirrored from real
// Quest completions. Mounted once, globally (see ChallengeQuestSyncEffect),
// so completing a Quest anywhere in the app - the Quests page, the
// dashboard, a Focus session, the desktop widget - logs the Challenge day,
// with no completion call site needing to know Challenges exist.
//
// Same shape as useGoalMetricSync: recompute the whole desired set from the
// underlying records and write the difference. That is what makes
// un-completing a Quest clear the day again, and a deleted or back-dated
// completion correct itself, without a separate undo path to keep in step.
export function useChallengeQuestSync() {
  const { challenges, hasLoaded: challengesLoaded } = useChallenges();
  const { metrics, hasLoaded: metricsLoaded } = useChallengeMetrics();
  const { reconcileQuestEntries, hasLoaded: entriesLoaded } = useChallengeEntries();
  const { questCompletions, isReady: progressionReady } = useProgression();

  useEffect(() => {
    if (!challengesLoaded || !metricsLoaded || !entriesLoaded || !progressionReady) {
      return;
    }

    reconcileQuestEntries(computeQuestLinkedEntries({ challenges, metrics, questCompletions }), getQuestLinkedMetricIds(metrics));
  }, [challenges, metrics, questCompletions, challengesLoaded, metricsLoaded, entriesLoaded, progressionReady, reconcileQuestEntries]);
}
