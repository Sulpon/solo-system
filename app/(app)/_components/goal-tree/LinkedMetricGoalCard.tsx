"use client";

import Card from "../Card";
import Progress from "../Progress";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { collectProgressGoalNodes } from "../../_lib/goal-tree-storage";
import { getGoalMetric } from "../../_lib/goal-metrics";

type LinkedMetricGoalCardProps = Readonly<{
  metricId: string;
  thisWeekValue: number;
  todayValue: number;
  accentClass?: string;
  defaultTitle: string;
  defaultTargetValue: number;
}>;

// Shows the progress_goal (if any) linked to `metricId`, reading its
// currentValue/target straight from the goal tree - the same value
// useGoalMetricSync keeps mirrored from the real activity records that
// back the calendar right below this card. This is the "why" view: the
// goal and the calendar are two faces of the same underlying data.
export default function LinkedMetricGoalCard({ metricId, thisWeekValue, todayValue, accentClass = "text-cyan-300", defaultTitle, defaultTargetValue }: LinkedMetricGoalCardProps) {
  const { goalTree, hasLoaded, createRootNode } = useGoalTree();
  const metric = getGoalMetric(metricId);

  if (!hasLoaded || !metric) {
    return null;
  }

  const linkedGoal = collectProgressGoalNodes(goalTree).find((node) => node.metricSource === metricId) ?? null;

  if (!linkedGoal) {
    return (
      <Card className="p-5">
        <p className={"text-xs font-semibold uppercase tracking-[0.22em] " + accentClass}>Goal</p>
        <h2 className="mt-2 text-xl font-black text-white">No goal linked yet</h2>
        <p className="mt-2 text-sm text-slate-400">Link a target so this activity counts toward something - the goal will stay in sync automatically from here on.</p>
        <button
          type="button"
          onClick={() =>
            createRootNode({
              title: defaultTitle,
              description: "",
              type: "progress_goal",
              status: "not_started",
              currentValue: 0,
              targetValue: defaultTargetValue,
              unit: metric.unit,
              metricSource: metricId,
            })
          }
          className="mt-4 rounded-xl border border-cyan-500/50 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/25"
        >
          + Create {metric.label} Goal
        </button>
      </Card>
    );
  }

  const currentValue = Math.max(0, Number(linkedGoal.currentValue ?? 0));
  const targetValue = Math.max(1, Number(linkedGoal.targetValue ?? 1));
  const displayProgress = Math.min(100, Math.round((currentValue / targetValue) * 100));
  const exceedsTarget = currentValue > targetValue;

  return (
    <Card className="p-5">
      <p className={"text-xs font-semibold uppercase tracking-[0.22em] " + accentClass}>Goal</p>
      <h2 className="mt-2 text-xl font-black text-white">{linkedGoal.title}</h2>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-black text-white">
            {currentValue.toLocaleString()} / {targetValue.toLocaleString()} {metric.unit}
          </p>
          {exceedsTarget ? <p className="mt-1 text-xs text-slate-500">Target reached - actual {currentValue.toLocaleString()} / {targetValue.toLocaleString()}</p> : null}
        </div>
        <p className="text-2xl font-black text-white">{displayProgress}%</p>
      </div>
      <Progress value={displayProgress} max={100} className="mt-3 h-3 overflow-hidden rounded-full bg-slate-900" fillClassName={"h-full bg-gradient-to-r from-purple-500 to-cyan-400"} />

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">This Week</p>
          <p className="mt-1 text-2xl font-black text-white">{thisWeekValue.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Today</p>
          <p className="mt-1 text-2xl font-black text-white">{todayValue.toLocaleString()}</p>
        </div>
      </div>
    </Card>
  );
}
