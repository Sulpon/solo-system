"use client";

import { useChallengeQuestSync } from "../../_lib/hooks/useChallengeQuestSync";

// Renders nothing - mounted once at the app root so a Quest completed
// anywhere logs its linked Challenge day, exactly as GoalMetricSyncEffect
// does for metric-linked progress goals (see useChallengeQuestSync.ts).
export default function ChallengeQuestSyncEffect() {
  useChallengeQuestSync();
  return null;
}
