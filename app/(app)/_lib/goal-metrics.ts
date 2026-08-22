// A Goal Metric is a named, computable quantity backed by real activity
// records elsewhere in the app (thesis writing log, job applications, ...).
// A progress_goal node can link to one via `GoalNode.metricSource`; when
// linked, its `currentValue` is kept in sync with `compute()` instead of
// being hand-typed, so the goal and any calendar/chart built on the same
// records can never drift apart.
//
// This covers metrics backed by a continuous, freely-editable log (Thesis
// pages, Career applications). Quest-driven goal progress (e.g. a Backtest
// Quest contributing trades to a goal) is a different, event-based pattern
// - see QuestCompletion.goalContribution in types/quest.ts and
// useQuestCompletionFlow.ts - and does not go through this registry.

import { getTotalPagesWritten } from "./engines/thesis-engine";
import { getTotalApplications } from "./engines/career-hub-engine";
import type { WritingLogEntry } from "./types/writing-log";
import type { VacancyEntry } from "./types/vacancy";

export type GoalMetricContext = Readonly<{
  writingLogEntries: ReadonlyArray<WritingLogEntry>;
  vacancyEntries: ReadonlyArray<VacancyEntry>;
}>;

export type GoalMetricDefinition = Readonly<{
  id: string;
  label: string;
  unit: string;
  compute: (context: GoalMetricContext) => number;
}>;

export const GOAL_METRICS: ReadonlyArray<GoalMetricDefinition> = [
  {
    id: "thesis-pages-written",
    label: "Thesis Pages Written",
    unit: "pages",
    compute: (context) => getTotalPagesWritten(context.writingLogEntries),
  },
  {
    id: "career-applications-submitted",
    label: "Applications Submitted",
    unit: "applications",
    compute: (context) => getTotalApplications(context.vacancyEntries),
  },
];

export function getGoalMetric(metricSource: string | undefined): GoalMetricDefinition | null {
  if (!metricSource) {
    return null;
  }

  return GOAL_METRICS.find((metric) => metric.id === metricSource) ?? null;
}
