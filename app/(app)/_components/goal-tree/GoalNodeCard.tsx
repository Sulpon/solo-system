"use client";

import Progress from "../Progress";
import Card from "../Card";
import type { GoalNodeView } from "../../_lib/goal-tree-progress";

type GoalNodeCardProps = Readonly<{
  node: GoalNodeView;
  isCollapsed: (nodeId: string) => boolean;
  onToggleCollapse: (nodeId: string) => void;
  onAddChild: (node: GoalNodeView) => void;
  onEdit: (node: GoalNodeView) => void;
  onDelete: (node: GoalNodeView) => void;
  onCompleteSequentialStep: (nodeId: string) => void;
  onUndoSequentialStep: (nodeId: string) => void;
}>;

const typeStyles: Record<string, string> = {
  dream: "text-purple-300 border-purple-400/30 bg-purple-500/10",
  long_term_goal: "text-cyan-200 border-cyan-400/30 bg-cyan-400/10",
  milestone: "text-emerald-200 border-emerald-400/30 bg-emerald-400/10",
  quest: "text-amber-200 border-amber-400/30 bg-amber-400/10",
  progress_goal: "text-fuchsia-200 border-fuchsia-400/30 bg-fuchsia-500/10",
  sequential_milestone: "text-fuchsia-200 border-fuchsia-400/30 bg-fuchsia-500/10",
};

const statusStyles: Record<string, string> = {
  not_started: "text-slate-400 border-slate-700 bg-slate-950/50",
  in_progress: "text-cyan-200 border-cyan-400/20 bg-cyan-400/10",
  completed: "text-emerald-200 border-emerald-400/20 bg-emerald-400/10",
};

function formatType(type: string) {
  return type
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatProgressValue(node: GoalNodeView) {
  if (node.type !== "progress_goal") {
    return null;
  }

  const currentValue = Math.max(0, Number(node.currentValue ?? 0));
  const targetValue = Math.max(1, Number(node.targetValue ?? 1));
  const unit = node.unit?.trim();

  return `${currentValue.toLocaleString()} / ${targetValue.toLocaleString()}${unit ? ` ${unit}` : ""}`;
}

function getIndentClass(depth: number) {
  if (depth <= 0) {
    return "";
  }

  return "ml-4 border-l border-slate-800 pl-4";
}

export default function GoalNodeCard({
  node,
  isCollapsed,
  onToggleCollapse,
  onAddChild,
  onEdit,
  onDelete,
  onCompleteSequentialStep,
  onUndoSequentialStep,
}: GoalNodeCardProps) {
  const collapsed = isCollapsed(node.id);
  const isLeaf = node.children.length === 0;
  const isSequential = node.type === "sequential_milestone";
  const steps = node.steps ?? [];
  const currentStepIndex = Math.max(0, Math.min(steps.length, node.currentStepIndex ?? 0));
  const currentStep = currentStepIndex < steps.length ? steps[currentStepIndex] : null;
  const completedSteps = steps.slice(0, currentStepIndex).filter((step) => step.completed);
  const upcomingSteps = currentStepIndex < steps.length ? steps.slice(currentStepIndex + 1) : [];
  const unlockedUpcomingSteps = upcomingSteps.filter((step) => !step.completed);
  const latestCompletedStep = completedSteps[completedSteps.length - 1] ?? null;

  return (
    <div className={getIndentClass(node.depth)}>
      <Card className={node.depth === 0 ? "overflow-hidden border-purple-500/25 bg-[linear-gradient(135deg,rgba(15,23,42,0.76),rgba(2,6,23,0.94))] p-5" : "overflow-hidden border-slate-800 bg-slate-950/60 p-4"}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={"min-w-0 break-words font-black text-white " + (node.depth === 0 ? "text-2xl" : "text-lg")}>{node.title}</h3>
                <span className={"rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] " + (typeStyles[node.type] ?? statusStyles.not_started)}>
                  {formatType(node.type)}
                </span>
                <span className={"rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] " + (statusStyles[node.status] ?? statusStyles.not_started)}>
                  {formatType(node.status)}
                </span>
              </div>
              {node.description ? <p className="mt-2 max-w-3xl text-sm text-slate-400">{node.description}</p> : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {!isSequential ? (
                <button type="button" onClick={() => onAddChild(node)} className="rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300 hover:text-white">
                  Add Child
                </button>
              ) : null}
              <button type="button" onClick={() => onEdit(node)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-purple-400/60 hover:text-white">
                Edit
              </button>
              <button type="button" onClick={() => onToggleCollapse(node.id)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-cyan-400/60 hover:text-white">
                {collapsed ? "Expand" : "Collapse"}
              </button>
              <button type="button" onClick={() => onDelete(node)} className="rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:border-rose-300 hover:text-white">
                Delete
              </button>
            </div>
          </div>

          {isSequential ? (
            <div className="space-y-4 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-200">Sequential Milestone</p>
                  <p className="mt-1 text-sm text-slate-400">Only one step is active at a time.</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-center">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Sequence Progress</p>
                  <p className="mt-1 text-xl font-black text-white">{node.progress}%</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-center">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Steps</p>
                  <p className="mt-1 text-3xl font-black text-white">
                    {completedSteps.length} / {steps.length}
                  </p>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
                    <span>{steps.length === 0 ? "Add steps in the editor" : `${completedSteps.length} completed`}</span>
                    <span>{node.completed ? "Sequence complete" : "One step active at a time"}</span>
                  </div>
                  <Progress
                    value={node.progress}
                    max={100}
                    className="h-3 overflow-hidden rounded-full bg-slate-950/80"
                    fillClassName="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400"
                  />
                </div>
              </div>

              {currentStep ? (
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Current Objective</p>
                  <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-white">▶ {currentStep.title}</p>
                      {currentStep.description ? <p className="mt-1 text-sm text-slate-400">{currentStep.description}</p> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => onCompleteSequentialStep(node.id)}
                      className="rounded-xl border border-fuchsia-400/50 bg-fuchsia-500/15 px-4 py-2 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-500/25"
                    >
                      Complete Step
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-4 text-sm text-slate-400">
                  Add steps to build the sequence.
                </div>
              )}

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Upcoming</p>
                  <div className="mt-3 space-y-2">
                    {unlockedUpcomingSteps.length > 0 ? (
                      unlockedUpcomingSteps.map((step) => (
                        <div key={step.id} className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
                          🔒 {step.title}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No upcoming steps.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Completed</p>
                  <div className="mt-3 space-y-2">
                    {completedSteps.length > 0 ? (
                      <>
                        {completedSteps.map((step) => (
                          <div key={step.id} className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-sm text-emerald-100">
                            ✓ {step.title}
                          </div>
                        ))}
                        {latestCompletedStep ? (
                          <button
                            type="button"
                            onClick={() => onUndoSequentialStep(node.id)}
                            className="mt-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-purple-400/60 hover:text-white"
                          >
                            Undo Latest Completed Step
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-sm text-slate-500">No completed steps yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-center">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Progress</p>
                  <p className="mt-1 text-3xl font-black text-white">{node.progress}%</p>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
                    <span>
                      {node.type === "progress_goal" ? formatProgressValue(node) ?? `${node.completedCount} / ${node.totalCount} completed` : `${node.completedCount} / ${node.totalCount} completed`}
                    </span>
                    <span>{node.type === "progress_goal" ? "tracked value" : node.children.length > 0 ? "child nodes" : "leaf node"}</span>
                  </div>
                  <Progress
                    value={node.progress}
                    max={100}
                    className="h-3 overflow-hidden rounded-full bg-slate-950/80"
                    fillClassName="h-full bg-gradient-to-r from-purple-500 to-cyan-400"
                  />
                </div>
              </div>

              {node.type === "progress_goal" ? (
                <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold uppercase tracking-[0.16em] text-cyan-200">Progress Goal</span>
                    <span>{formatProgressValue(node)}</span>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {node.children.length > 0 && !collapsed ? (
            <div className="space-y-4 pt-1">
              {node.children.map((child) => (
                <GoalNodeCard
                  key={child.id}
                  node={child}
                  isCollapsed={isCollapsed}
                  onToggleCollapse={onToggleCollapse}
                  onAddChild={onAddChild}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onCompleteSequentialStep={onCompleteSequentialStep}
                  onUndoSequentialStep={onUndoSequentialStep}
                />
              ))}
            </div>
          ) : null}

          {isLeaf ? <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Leaf nodes resolve directly from their own status.</p> : null}
        </div>
      </Card>
    </div>
  );
}
