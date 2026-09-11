"use client";

import { useMemo } from "react";
import { useAtlasContext } from "../atlas-context";
import { useGoalTree } from "./useGoalTree";
import { useProgression } from "./useProgression";
import { useNotes } from "./useNotes";
import { useLibrary } from "./useLibrary";
import { useAttributes } from "./useAttributes";
import { useFocusHistory } from "./useFocusHistory";
import { computePersonalIntelligence } from "../intelligence/intelligence-engine";
import type { PersonalIntelligenceSnapshot } from "../intelligence/types";

// Phase 11's React/data wiring seam: gathers exactly the real Atlas data
// the pure intelligence-engine needs, straight from each domain's existing
// hook (the same hooks every other page already uses - no new stores, no
// new fetching). All composition/derivation logic itself lives in
// _lib/intelligence/ and stays React-independent.
export function usePersonalIntelligence(): PersonalIntelligenceSnapshot {
  const atlas = useAtlasContext();
  const { goalTree } = useGoalTree();
  const { questDefinitions, questCompletions, activityEvents } = useProgression();
  const { notes } = useNotes();
  const { items: libraryItems } = useLibrary();
  const { attributes } = useAttributes();
  const { history: focusHistory } = useFocusHistory();

  return useMemo(
    () =>
      computePersonalIntelligence({
        now: atlas.now,
        goalTree,
        quests: questDefinitions,
        completions: questCompletions,
        notes,
        libraryItems,
        attributes,
        focusHistory,
        activityEvents,
        todaysCalendarItems: atlas.todaysCalendarItems,
        priorityGateState: atlas.priorityGateState,
        availableUnscheduledMinutes: atlas.presentMoment.availableUnscheduledMinutes,
        presentMoment: atlas.presentMoment,
        activeQuest: atlas.activeQuest,
        isQuestExecution: atlas.isQuestExecution,
        currentPriorityQuadrant: atlas.currentPriorityQuadrant,
      }),
    [
      atlas.now,
      goalTree,
      questDefinitions,
      questCompletions,
      notes,
      libraryItems,
      attributes,
      focusHistory,
      activityEvents,
      atlas.todaysCalendarItems,
      atlas.priorityGateState,
      atlas.presentMoment,
      atlas.activeQuest,
      atlas.isQuestExecution,
      atlas.currentPriorityQuadrant,
    ],
  );
}
