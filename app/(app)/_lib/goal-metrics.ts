// A Goal Metric is a named, computable quantity backed by real activity
// records elsewhere in the app (workout history, thesis writing log, job
// applications, ...). A progress_goal node can link to one via
// `GoalNode.metricSource`; when linked, its `currentValue` is kept in sync
// with `compute()` instead of being hand-typed, so the goal and any
// calendar/chart built on the same records can never drift apart.
//
// Adding a future metric (workouts completed, focus hours, backtests
// logged, ...) means adding one entry here - no new tracking system.

import { getTotalPagesWritten } from "./engines/thesis-engine";
import { getTotalApplications } from "./engines/career-hub-engine";
import { getTotalTradesLogged, getTradesLoggedForDay } from "./engines/trading-engine";
import type { WritingLogEntry } from "./types/writing-log";
import type { VacancyEntry } from "./types/vacancy";
import type { TradeLogEntry } from "./types/trade-log";

export type GoalMetricContext = Readonly<{
  writingLogEntries: ReadonlyArray<WritingLogEntry>;
  vacancyEntries: ReadonlyArray<VacancyEntry>;
  tradeLogEntries: ReadonlyArray<TradeLogEntry>;
}>;

export type GoalMetricDefinition = Readonly<{
  id: string;
  label: string;
  unit: string;
  compute: (context: GoalMetricContext) => number;
  // Optional: a per-day value, for metrics that back a Challenge's daily
  // target (see challenge-engine.ts) rather than only a cumulative goal.
  computeForDay?: (context: GoalMetricContext, dayKey: string) => number;
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
  {
    id: "backtest-trades-logged",
    label: "Backtest Trades Logged",
    unit: "trades",
    compute: (context) => getTotalTradesLogged(context.tradeLogEntries),
    computeForDay: (context, dayKey) => getTradesLoggedForDay(context.tradeLogEntries, dayKey),
  },
];

export function getGoalMetric(metricSource: string | undefined): GoalMetricDefinition | null {
  if (!metricSource) {
    return null;
  }

  return GOAL_METRICS.find((metric) => metric.id === metricSource) ?? null;
}
