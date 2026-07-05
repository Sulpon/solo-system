"use client";

import Card from "../Card";
import Progress from "../Progress";
import { getEventsByType } from "../../_lib/activity-events";
import type { ActivityEvent } from "../../_lib/types/activity-event";
import type { GoalTree } from "../../_lib/types/goal-tree";
import type { Quest } from "../../_lib/types/quest";
import { calculateGoalTree, summarizeGoalTree } from "../../_lib/goal-tree-progress";

export function StatNumberCard({
  eyebrow,
  title,
  value,
  description,
  accentClass = "text-purple-300",
}: Readonly<{
  eyebrow: string;
  title: string;
  value: string;
  description: string;
  accentClass?: string;
}>) {
  return (
    <Card className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
      <p className={"text-xs font-semibold uppercase tracking-[0.22em] " + accentClass}>{eyebrow}</p>
      <h2 className="mt-2 text-xl font-black text-white">{title}</h2>
      <p className="mt-4 text-4xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </Card>
  );
}

export function QuestStatsCard({
  quests,
  activityEvents,
}: Readonly<{
  quests: ReadonlyArray<Quest>;
  activityEvents: ReadonlyArray<ActivityEvent>;
}>) {
  const activeCore = quests.filter((quest) => quest.status === "active" && (quest.importance ?? "core") === "core").length;
  const activeBonus = quests.filter((quest) => quest.status === "active" && (quest.importance ?? "core") === "bonus").length;
  const questXp = getEventsByType(activityEvents, "quest_xp_awarded").reduce((total, event) => total + (typeof event.metadata.xp === "number" ? event.metadata.xp : 0), 0);

  return (
    <Card className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Quest Stats</p>
      <h2 className="mt-2 text-xl font-black text-white">Quest system overview</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Core</p>
          <p className="mt-2 text-3xl font-black text-white">{activeCore}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Bonus</p>
          <p className="mt-2 text-3xl font-black text-white">{activeBonus}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Quest XP</p>
          <p className="mt-2 text-3xl font-black text-white">{questXp.toLocaleString()}</p>
        </div>
      </div>
    </Card>
  );
}

export function GoalTreeStatsCard({ goalTree }: Readonly<{ goalTree: GoalTree }>) {
  const summary = summarizeGoalTree(goalTree);
  const nodes = calculateGoalTree(goalTree);
  const nearCompletion = nodes.filter((node) => node.progress >= 70 && node.progress < 100).slice(0, 4);

  return (
    <Card className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Goal Tree Stats</p>
      <h2 className="mt-2 text-xl font-black text-white">Dream progress summary</h2>
      <div className="mt-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-4xl font-black text-white">{summary.progress}%</p>
          <p className="mt-1 text-sm text-slate-400">{summary.completedChildrenCount} / {summary.directChildrenCount} completed</p>
        </div>
        <div className="min-w-[160px] flex-1">
          <Progress value={summary.progress} max={100} className="h-3 overflow-hidden rounded-full bg-slate-950/80" fillClassName="h-full bg-gradient-to-r from-purple-500 to-cyan-300" />
        </div>
      </div>
      <div className="mt-5 space-y-2">
        {nearCompletion.length > 0 ? nearCompletion.map((node) => (
          <div key={node.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
            <span className="truncate text-sm font-semibold text-white">{node.title}</span>
            <span className="shrink-0 text-sm text-cyan-200">{node.progress}%</span>
          </div>
        )) : <p className="rounded-xl border border-dashed border-slate-700 bg-slate-950/45 p-4 text-sm text-slate-400">No goals near completion yet.</p>}
      </div>
    </Card>
  );
}
