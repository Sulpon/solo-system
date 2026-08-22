"use client";

import { useEffect } from "react";
import { useGoalTree } from "./useGoalTree";
import { useWritingLogEntries } from "./useWritingLogEntries";
import { useVacancyEntries } from "./useVacancyEntries";
import { collectProgressGoalNodes } from "../goal-tree-storage";
import { getGoalMetric } from "../goal-metrics";
import type { GoalMetricContext } from "../goal-metrics";

// Keeps every metric-linked progress_goal's currentValue mirrored from its
// real activity records. Mounted once, globally (see GoalMetricSyncEffect),
// so a goal stays correct regardless of which page last touched the
// underlying data. Always recomputes the full sum from scratch and writes
// only the delta through the existing updateProgressGoal path - that reuses
// the current XP-award/activity-event logic untouched and means there is
// never a chance of the stored value drifting from the real records: any
// edit or deletion of an activity entry is reflected on the very next sync.
export function useGoalMetricSync() {
  const { goalTree, hasLoaded: goalTreeLoaded, updateProgressGoal } = useGoalTree();
  const { entries: writingLogEntries, hasLoaded: writingLogLoaded } = useWritingLogEntries();
  const { entries: vacancyEntries, hasLoaded: vacanciesLoaded } = useVacancyEntries();

  useEffect(() => {
    if (!goalTreeLoaded || !writingLogLoaded || !vacanciesLoaded) {
      return;
    }

    const context: GoalMetricContext = { writingLogEntries, vacancyEntries };
    const linkedGoals = collectProgressGoalNodes(goalTree).filter((node) => node.metricSource);

    for (const node of linkedGoals) {
      const metric = getGoalMetric(node.metricSource);

      if (!metric) {
        continue;
      }

      const liveValue = metric.compute(context);
      const storedValue = Math.max(0, Number(node.currentValue ?? 0));

      if (liveValue !== storedValue) {
        updateProgressGoal(node.id, liveValue - storedValue);
      }
    }
    // Comparing live vs. stored value before writing makes this idempotent -
    // once a linked goal is in sync, re-running this effect is a no-op, so
    // it's safe to depend on goalTree even though updateProgressGoal writes
    // back into it.
  }, [goalTree, goalTreeLoaded, writingLogLoaded, vacanciesLoaded, writingLogEntries, vacancyEntries, updateProgressGoal]);
}
