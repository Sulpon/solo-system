"use client";

import Progress from "../Progress";
import type { GoalNodeView } from "../../_lib/goal-tree-progress";

type GoalProgressCellProps = Readonly<{
  node: GoalNodeView;
}>;

function getSequentialSummary(node: GoalNodeView) {
  const steps = node.steps ?? [];
  const completed = steps.filter((step) => step.completed).length;
  const total = steps.length;
  const currentIndex = Math.min(Math.max(0, node.currentStepIndex ?? 0), total);

  return {
    completed,
    total,
    currentIndex,
    currentTitle: currentIndex < total ? steps[currentIndex]?.title : undefined,
  };
}

export default function GoalProgressCell({ node }: GoalProgressCellProps) {
  if (node.type === "progress_goal") {
    const currentValue = Math.max(0, Number(node.currentValue ?? 0));
    const targetValue = Math.max(1, Number(node.targetValue ?? 1));
    const unit = node.unit?.trim();

    return (
      <div className="min-w-0 space-y-1.5">
        <div className="flex min-w-0 items-center justify-between gap-2 text-xs sm:text-sm">
          <span className="min-w-0 truncate text-slate-300">
            {currentValue.toLocaleString()} / {targetValue.toLocaleString()}
            {unit ? ` ${unit}` : ""}
          </span>
          <span className="shrink-0 whitespace-nowrap font-semibold text-orange-200">{node.progress}%</span>
        </div>
        <Progress
          value={node.progress}
          max={100}
          className="h-1.5 overflow-hidden rounded-full bg-slate-950/80"
          fillClassName="h-full bg-gradient-to-r from-orange-400 to-fuchsia-400"
        />
      </div>
    );
  }

  if (node.type === "sequential_milestone") {
    const summary = getSequentialSummary(node);

    return (
      <div className="min-w-0 space-y-1.5">
        <div className="flex min-w-0 items-center justify-between gap-2 text-xs sm:text-sm">
          <span className="min-w-0 truncate text-slate-300">
            {summary.completed} / {summary.total} steps
          </span>
          <span className="shrink-0 whitespace-nowrap font-semibold text-fuchsia-200">{node.progress}%</span>
        </div>
        <Progress
          value={node.progress}
          max={100}
          className="h-1.5 overflow-hidden rounded-full bg-slate-950/80"
          fillClassName="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400"
        />
      </div>
    );
  }

  if (node.children.length > 0) {
    return (
      <div className="min-w-0 space-y-1.5">
        <div className="flex min-w-0 items-center justify-between gap-2 text-xs sm:text-sm">
          <span className="min-w-0 truncate text-slate-300">
            {node.completedCount} / {node.totalCount} completed
          </span>
          <span className="shrink-0 whitespace-nowrap font-semibold text-cyan-200">{node.progress}%</span>
        </div>
        <Progress
          value={node.progress}
          max={100}
          className="h-1.5 overflow-hidden rounded-full bg-slate-950/80"
          fillClassName="h-full bg-gradient-to-r from-cyan-400 to-purple-500"
        />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex min-w-0 items-center justify-between gap-2 text-xs sm:text-sm">
        <span className="min-w-0 truncate text-slate-300">{node.status === "completed" ? "Complete" : "Incomplete"}</span>
        <span className="shrink-0 whitespace-nowrap font-semibold text-emerald-200">{node.progress}%</span>
      </div>
      <Progress
        value={node.progress}
        max={100}
        className="h-1.5 overflow-hidden rounded-full bg-slate-950/80"
        fillClassName="h-full bg-gradient-to-r from-emerald-400 to-cyan-400"
      />
    </div>
  );
}
