"use client";

import { useMemo } from "react";
import { useAtlasContext } from "../atlas-context";
import { useGoalTree } from "./useGoalTree";
import { useProgression } from "./useProgression";
import { useNotes } from "./useNotes";
import { useLibrary } from "./useLibrary";
import { useAttributes } from "./useAttributes";
import { useFocusHistory } from "./useFocusHistory";
import { computeAtlasIntelligenceContext } from "../context/context-engine";
import type { StructuredAtlasContext } from "../context/context-engine";

// Phase 13's React/data wiring seam - same pattern as usePersonalIntelligence.ts
// and useAchievementMoments.ts: gathers real data from each domain's
// existing hook and hands it to the pure context-engine. Deliberately
// separate from useAtlasContext() itself (never modifies it) - this hook
// composes ON TOP of it for the smaller set of surfaces that need the full
// structured context (Mission Control's Relevant Context panel today,
// eventually JARVIS), while every other component keeps reading the
// lightweight useAtlasContext() directly.
export function useAtlasIntelligenceContext(): StructuredAtlasContext {
  const atlas = useAtlasContext();
  const { goalTree } = useGoalTree();
  const { questDefinitions, questCompletions, activityEvents } = useProgression();
  const { notes } = useNotes();
  const { items: libraryItems } = useLibrary();
  const { attributes } = useAttributes();
  const { history: focusHistory } = useFocusHistory();

  return useMemo(
    () =>
      computeAtlasIntelligenceContext({
        now: atlas.now,
        currentApp: atlas.currentApp,
        activeQuest: atlas.activeQuest,
        isQuestExecution: atlas.isQuestExecution,
        currentPriorityQuadrant: atlas.currentPriorityQuadrant,
        presentMoment: atlas.presentMoment,
        todaysCalendarItems: atlas.todaysCalendarItems,
        priorityGateState: atlas.priorityGateState,
        availableUnscheduledMinutes: atlas.presentMoment.availableUnscheduledMinutes,
        goalTree,
        quests: questDefinitions,
        completions: questCompletions,
        notes,
        libraryItems,
        attributes,
        focusHistory,
        activityEvents,
      }),
    [
      atlas.now,
      atlas.currentApp,
      atlas.activeQuest,
      atlas.isQuestExecution,
      atlas.currentPriorityQuadrant,
      atlas.presentMoment,
      atlas.todaysCalendarItems,
      atlas.priorityGateState,
      goalTree,
      questDefinitions,
      questCompletions,
      notes,
      libraryItems,
      attributes,
      focusHistory,
      activityEvents,
    ],
  );
}
