"use client";

import { useState } from "react";
import Card from "../Card";
import Progress from "../Progress";
import { categories } from "../../_lib/mock";
import GoalTypeBadge from "./GoalTypeBadge";
import type { GoalNodeView } from "../../_lib/goal-tree-progress";
import type { AttributeWeight } from "../../_lib/types/goal-tree";
import type { Quest } from "../../_lib/types/quest";

type GoalTreeDetailsPanelProps = Readonly<{
  node: GoalNodeView | null;
  parentTitle?: string;
  dreamTitle?: string;
  linkedQuests: Quest[];
  overview: Readonly<{
    title: string;
    count: number;
    progress: number;
    subtitle: string;
    relatedQuestTitles: string[];
  }>;
  onEdit: (nodeId: string) => void;
  onAddChild: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onUpdateProgress: (nodeId: string) => void;
  onAdvanceSequentialStep: (nodeId: string) => void;
  onUndoSequentialStep: (nodeId: string) => void;
  onEditQuest: (quest: Quest) => void;
  onDeleteQuest: (questId: string) => void;
  inheritedAttributeWeights: AttributeWeight[];
}>;

type DetailTab = "children" | "milestones" | "notes" | "history";

function PanelField({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/55 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm text-white">{value}</p>
    </div>
  );
}

function SectionTitle({ title, subtitle }: Readonly<{ title: string; subtitle?: string }>) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
    </div>
  );
}

function EmptyBlock({ title, text }: Readonly<{ title: string; text: string }>) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-3">
      <p className="text-sm font-semibold text-slate-300">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </div>
  );
}

function formatDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getSummaryLabel(node: GoalNodeView) {
  if (node.type === "progress_goal") {
    const currentValue = Math.max(0, Number(node.currentValue ?? 0));
    const targetValue = Math.max(1, Number(node.targetValue ?? 1));
    const unit = node.unit?.trim();

    return `${currentValue.toLocaleString()} / ${targetValue.toLocaleString()}${unit ? ` ${unit}` : ""}`;
  }

  if (node.type === "sequential_milestone") {
    const steps = node.steps ?? [];
    const completedSteps = steps.filter((step) => step.completed).length;

    return `${completedSteps} / ${steps.length} completed`;
  }

  return `${node.completedCount} / ${node.totalCount} completed`;
}

function getRemainingLabel(node: GoalNodeView) {
  if (node.type === "progress_goal") {
    const currentValue = Math.max(0, Number(node.currentValue ?? 0));
    const targetValue = Math.max(1, Number(node.targetValue ?? 1));
    const remaining = Math.max(0, targetValue - currentValue);
    const unit = node.unit?.trim();

    return `${remaining.toLocaleString()} ${unit ? `${unit} remaining` : "remaining"}`.trim();
  }

  if (node.type === "sequential_milestone") {
    return node.completed ? "Sequence complete" : "One step active at a time";
  }

  return node.children.length > 0 ? "Child nodes drive progress" : "Leaf node";
}

function nodeTabLabel(type: GoalNodeView["type"]) {
  switch (type) {
    case "dream":
      return "Dream";
    case "long_term_goal":
      return "Goal";
    case "milestone":
      return "Milestone";
    case "quest":
      return "Quest";
    case "progress_goal":
      return "Progress Goal";
    case "sequential_milestone":
      return "Sequential Milestone";
    default:
      return "Node";
  }
}

function NodeRow({ title, subtitle, progress, type }: Readonly<{ title: string; subtitle?: string; progress?: number; type: GoalNodeView["type"] }>) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/55 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <GoalTypeBadge type={type} />
        {typeof progress === "number" ? <span className="text-sm font-semibold text-slate-300">{progress}%</span> : null}
      </div>
    </div>
  );
}

function MiniChartEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 px-4 py-6 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/70 text-slate-500">
        <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" aria-hidden="true">
          <path d="M2.5 12.5H13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M4 10L6.5 8L8.5 9.5L11.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-white">No progress snapshots yet</p>
      <p className="mt-1 text-sm text-slate-500">We will show charts here once historical progress is available.</p>
    </div>
  );
}

export default function GoalTreeDetailsPanel({
  node,
  parentTitle,
  dreamTitle,
  linkedQuests,
  overview,
  onEdit,
  onAddChild,
  onDelete,
  onUpdateProgress,
  onAdvanceSequentialStep,
  onUndoSequentialStep,
  onEditQuest,
  onDeleteQuest,
  inheritedAttributeWeights,
}: GoalTreeDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("children");

  if (!node) {
    return (
      <Card className="h-full border-purple-500/20 bg-slate-950/45 p-5 lg:sticky lg:top-6">
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Goal Tree</p>
          <h2 className="mt-3 text-2xl font-black text-white">Choose a goal</h2>
          <p className="mt-3 text-sm text-slate-400">Select a row to inspect its details, children, and progress controls.</p>
        </div>
      </Card>
    );
  }

  const isSequential = node.type === "sequential_milestone";
  const isProgressGoal = node.type === "progress_goal";
  const isLeaf = node.children.length === 0;
  const steps = node.steps ?? [];
  const currentStepIndex = Math.max(0, Math.min(steps.length, node.currentStepIndex ?? 0));
  const currentStep = currentStepIndex < steps.length ? steps[currentStepIndex] : null;
  const completedSteps = steps.slice(0, currentStepIndex).filter((step) => step.completed);
  const latestCompletedStep = completedSteps[completedSteps.length - 1] ?? null;
  const upcomingSteps = currentStepIndex < steps.length ? steps.slice(currentStepIndex + 1).filter((step) => !step.completed) : [];
  const childMilestones = node.children.filter((child) => child.type === "milestone" || child.type === "sequential_milestone");
  const linkedQuestLabel = linkedQuests.length > 0 ? linkedQuests.map((quest) => quest.title).join(", ") : "None";
  const currentValue = isProgressGoal ? Math.max(0, Number(node.currentValue ?? 0)) : 0;
  const targetValue = isProgressGoal ? Math.max(1, Number(node.targetValue ?? 1)) : 0;
  const unit = isProgressGoal ? node.unit?.trim() : "";
  const remainingValue = isProgressGoal ? Math.max(0, targetValue - currentValue) : 0;

  return (
    <Card className="h-full border-purple-500/20 bg-slate-950/45 p-5 lg:sticky lg:top-6">
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{overview.title}</p>
              <p className="mt-2 text-3xl font-black text-white">{overview.count}</p>
              <p className="mt-2 text-sm text-slate-400">{overview.subtitle}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Overview</p>
              <p className="mt-1 text-2xl font-black text-white">{overview.progress}%</p>
            </div>
          </div>

          {overview.relatedQuestTitles.length > 0 ? (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/55 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Related Quests</p>
              <div className="mt-3 space-y-2">
                {overview.relatedQuestTitles.slice(0, 4).map((title, index) => (
                  <div key={title + "-" + index} className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
                    {title}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/45 px-4 py-3 text-sm text-slate-500">No linked quests yet.</div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Inherited Attributes</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {inheritedAttributeWeights.length > 0 ? (
                inheritedAttributeWeights.map((weight) => {
                  const attribute = categories.find((item) => item.id === weight.attributeId);

                  return (
                    <span key={weight.attributeId} className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">
                      {attribute?.name ?? weight.attributeId} {weight.weight}%
                    </span>
                  );
                })
              ) : (
                <span className="text-sm text-slate-500">No inherited attributes</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <GoalTypeBadge type={node.type} />
              <h2 className="mt-3 text-3xl font-black leading-tight text-white">{node.title}</h2>
              {node.description ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{node.description}</p> : null}
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/55 px-4 py-3 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Progress</p>
              <p className="mt-1 text-3xl font-black text-white">{node.progress}%</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <PanelField label="Parent" value={parentTitle ?? "None"} />
            <PanelField label="Dream" value={dreamTitle ?? "None"} />
            <PanelField label="Type" value={nodeTabLabel(node.type)} />
            <PanelField label="Created" value={formatDate(node.createdAt)} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle title="Progress Overview" subtitle={isProgressGoal ? "Tracked target progress" : "Node progress is calculated from its children"} />
            {isProgressGoal ? (
              <button
                type="button"
                onClick={() => onUpdateProgress(node.id)}
                className="rounded-xl border border-orange-400/30 bg-orange-400/10 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:border-orange-300 hover:bg-orange-400/15 hover:text-white"
              >
                Update Progress
              </button>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-3xl font-black text-white">{getSummaryLabel(node)}</p>
              <p className="mt-2 text-sm text-slate-500">{getRemainingLabel(node)}</p>
            </div>
            <p className="text-right text-2xl font-black text-white">{node.progress}%</p>
          </div>

          <div className="mt-4">
            <Progress
              value={node.progress}
              max={100}
              className="h-3 overflow-hidden rounded-full bg-slate-900/80"
              fillClassName={
                isProgressGoal
                  ? "h-full bg-gradient-to-r from-orange-400 to-fuchsia-400"
                  : isSequential
                    ? "h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400"
                    : "h-full bg-gradient-to-r from-purple-500 to-cyan-400"
              }
            />
          </div>

          {isProgressGoal ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <PanelField label="Current" value={currentValue.toLocaleString()} />
              <PanelField label="Target" value={targetValue.toLocaleString()} />
              <PanelField label="Remaining" value={`${remainingValue.toLocaleString()}${unit ? ` ${unit}` : ""}`} />
              <PanelField label="Linked Quests" value={linkedQuestLabel} />
            </div>
          ) : null}
        </div>

        {isSequential ? (
          <div className="space-y-3 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionTitle title="Sequential Milestone" subtitle="Only one step is active at a time." />
              <span className="text-sm text-slate-400">
                {completedSteps.length} / {steps.length} completed
              </span>
            </div>

            <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Current Objective</p>
              {currentStep ? (
                <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-white">▶ {currentStep.title}</p>
                    {currentStep.description ? <p className="mt-1 text-sm text-slate-400">{currentStep.description}</p> : null}
                  </div>
                  {latestCompletedStep ? (
                    <button
                      type="button"
                      onClick={() => onUndoSequentialStep(node.id)}
                      className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-purple-400/60 hover:text-white"
                    >
                      Undo Latest Step
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAdvanceSequentialStep(node.id)}
                      className="rounded-xl border border-fuchsia-400/50 bg-fuchsia-500/15 px-4 py-2 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-500/25"
                    >
                      Complete Step
                    </button>
                  )}
                </div>
              ) : (
                <EmptyBlock title="No current step" text="Add steps in the editor to build the sequence." />
              )}
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Upcoming</p>
                <div className="mt-3 space-y-2">
                  {upcomingSteps.length > 0 ? (
                    upcomingSteps.slice(0, 4).map((step) => (
                      <div key={step.id} className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
                        🔒 {step.title}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No upcoming steps.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Completed</p>
                <div className="mt-3 space-y-2">
                  {completedSteps.length > 0 ? (
                    completedSteps.slice(-4).map((step) => (
                      <div key={step.id} className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-sm text-emerald-100">
                        ✓ {step.title}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No completed steps yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
            <SectionTitle title="Progress Over Time" subtitle={isLeaf ? "No historical data yet." : "Current values are derived from the tree."} />
            <div className="mt-4">
              <MiniChartEmptyState />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
            <SectionTitle title="Completion Forecast" subtitle="Estimated timing appears when historical snapshots exist." />
            <div className="mt-4">
              <MiniChartEmptyState />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
          <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
            {([
              ["children", "Children"],
              ["milestones", "Milestones"],
              ["notes", "Notes"],
              ["history", "History"],
            ] as const).map(([tabKey, label]) => (
              <button
                key={tabKey}
                type="button"
                onClick={() => setActiveTab(tabKey)}
                className={
                  "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition " +
                  (activeTab === tabKey
                    ? "border-purple-400/60 bg-purple-500/15 text-purple-100"
                    : "border-slate-700 bg-slate-950/60 text-slate-400 hover:border-purple-400/40 hover:text-white")
                }
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {activeTab === "children" ? (
              node.children.length > 0 ? (
                <div className="space-y-2">
                  {node.children.map((child) => (
                    <NodeRow key={child.id} title={child.title} subtitle={child.description ?? undefined} type={child.type} progress={child.progress} />
                  ))}
                </div>
              ) : (
                <EmptyBlock title="No child goals" text="Add child goals to build this branch of the tree." />
              )
            ) : null}

            {activeTab === "milestones" ? (
              childMilestones.length > 0 ? (
                <div className="space-y-2">
                  {childMilestones.map((child) => (
                    <NodeRow key={child.id} title={child.title} subtitle={child.description ?? undefined} type={child.type} progress={child.progress} />
                  ))}
                </div>
              ) : (
                <EmptyBlock title="No milestones" text="Milestones linked to this goal will appear here." />
              )
            ) : null}

            {activeTab === "notes" ? (
              <div className="space-y-3">
                {node.description ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/55 px-4 py-3">
                    <p className="text-sm text-slate-400">{node.description}</p>
                  </div>
                ) : (
                  <EmptyBlock title="No notes" text="Add a description in the editor to keep context here." />
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <PanelField label="Dream" value={dreamTitle ?? "None"} />
                  <PanelField label="Linked Quests" value={linkedQuestLabel} />
                </div>
              </div>
            ) : null}

            {activeTab === "history" ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <PanelField label="Created" value={formatDate(node.createdAt)} />
                  <PanelField label="Updated" value={formatDate(node.updatedAt)} />
                  <PanelField label="Status" value={node.status.replaceAll("_", " ")} />
                  <PanelField label="Children" value={String(node.children.length)} />
                </div>

                {linkedQuests.length > 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/55 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Linked Quests</p>
                    <div className="mt-3 space-y-2">
                      {linkedQuests.map((quest) => (
                        <div key={quest.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm text-slate-300">{quest.title}</p>
                            <p className="mt-1 text-xs text-slate-500">{quest.linkedProgressGoalId ? "Linked Quest" : "Quest"}</p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => onEditQuest(quest)}
                              className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:border-purple-400/60 hover:text-white"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteQuest(quest.id)}
                              className="rounded-lg border border-rose-500/35 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-100 transition hover:border-rose-300 hover:text-white"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyBlock title="No linked quests" text="Attach a quest to a progress goal to link the systems together." />
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onEdit(node.id)}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-purple-400/60 hover:text-white"
          >
            Edit
          </button>
          {node.type !== "sequential_milestone" ? (
            <button
              type="button"
              onClick={() => onAddChild(node.id)}
              className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300 hover:text-white"
            >
              Add Child
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDelete(node.id)}
            className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-300 hover:text-white"
          >
            Delete
          </button>
        </div>
      </div>
    </Card>
  );
}
