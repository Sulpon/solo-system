import type { PersonalState, PersonalRecommendation, NextAction } from "./types";

// Phase 11 Step 7/9 - "What should I do now?" / Decision Compression. The
// highest-priority recommendation, reshaped into the single actionable
// result Mission Control and the System Bar render. Deliberately returns
// null whenever an active mission already exists (Step 10: "Do not let
// intelligence recommendations interfere with active execution") - the
// existing active-mission UI (MissionControlPanel, System Bar's mission
// pill) already owns that state and takes priority.
export function getNextBestAction(state: PersonalState, recommendations: ReadonlyArray<PersonalRecommendation>): NextAction | null {
  if (state.activeMission) {
    return null;
  }

  const top = recommendations[0];
  if (!top) {
    return null;
  }

  return {
    entityId: top.entityId,
    actionType: top.actionType,
    title: top.title,
    reason: top.reason,
    evidence: top.evidence,
    priorityScore: top.priorityScore,
    href: top.href,
    availableMinutes: state.presentMoment.availableUnscheduledMinutes,
  };
}
