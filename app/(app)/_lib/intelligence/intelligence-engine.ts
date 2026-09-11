import { computeAllSignals, type SignalEngineInput } from "./signal-engine";
import { computePersonalState } from "./state-engine";
import { computeInsights } from "./insight-engine";
import { computeRecommendations } from "./recommendation-engine";
import { getNextBestAction } from "./next-action-engine";
import type { Quest, EisenhowerQuadrant } from "../types/quest";
import type { PresentMomentState } from "../engines/present-moment-engine";
import type { PersonalIntelligenceSnapshot } from "./types";

// Phase 11's top-level composition entry point: Existing Atlas Data ->
// Cross-App Relationships -> [this module] -> Signals -> State -> Insights
// -> Recommendations -> Next Action. Every field below is real data a
// caller already has from useAtlasContext() + its own data hooks - this
// function does not fetch, persist, or depend on React/localStorage/
// Supabase/an LLM; see hooks/usePersonalIntelligence.ts for the React/data
// wiring that feeds it.
export type IntelligenceEngineInput = SignalEngineInput &
  Readonly<{
    presentMoment: PresentMomentState;
    activeQuest: Quest | null;
    isQuestExecution: boolean;
    currentPriorityQuadrant: EisenhowerQuadrant | null;
  }>;

export function computePersonalIntelligence(input: IntelligenceEngineInput): PersonalIntelligenceSnapshot {
  const signals = computeAllSignals(input);

  const state = computePersonalState({
    now: input.now,
    goalTree: input.goalTree,
    activityEvents: input.activityEvents,
    presentMoment: input.presentMoment,
    activeQuest: input.activeQuest,
    isQuestExecution: input.isQuestExecution,
    currentPriorityQuadrant: input.currentPriorityQuadrant,
    signals,
  });

  const insights = computeInsights(signals);

  const recommendations = computeRecommendations({
    signals,
    quests: input.quests,
    presentMoment: input.presentMoment,
    availableUnscheduledMinutes: input.availableUnscheduledMinutes,
  });

  const nextAction = getNextBestAction(state, recommendations);

  return { state, signals, insights, recommendations, nextAction };
}
