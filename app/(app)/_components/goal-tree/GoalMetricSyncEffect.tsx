"use client";

import { useGoalMetricSync } from "../../_lib/hooks/useGoalMetricSync";

// Renders nothing - mounted once at the app root so metric-linked progress
// goals stay in sync no matter which page last touched the underlying
// activity data (see useGoalMetricSync.ts).
export default function GoalMetricSyncEffect() {
  useGoalMetricSync();
  return null;
}
