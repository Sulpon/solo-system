"use client";

import { Fragment } from "react";
import { getAncestorChainForQuest } from "../../_lib/engines/planning-engine";
import type { GoalNode, GoalTree } from "../../_lib/types/goal-tree";
import type { Quest } from "../../_lib/types/quest";

type QuestPlanningPathProps = Readonly<{
  quest: Quest;
  goalTree: GoalTree;
}>;

// Best-effort role label for a node in the ancestor chain. Planning-created
// nodes carry periodType and get their real Planning name; anything else
// (a plain progress_goal a Quest was linked to before Planning existed, or
// a node someone edited outside Planning) falls back to its raw type so
// this never pretends a node is something it isn't.
function getNodeRoleLabel(node: GoalNode): string {
  if (node.type === "dream") return "Dream";
  if (node.type === "long_term_goal" && node.periodType === "quarter") return "Quarterly Goal";
  if (node.type === "milestone" && node.periodType === "month") return "Monthly Milestone";
  if (node.type === "progress_goal" && node.periodType === "week") return "Weekly Milestone";
  if (node.type === "long_term_goal") return "Long Term Goal";
  if (node.type === "milestone") return "Milestone";
  if (node.type === "progress_goal") return "Progress Goal";
  if (node.type === "sequential_milestone") return "Sequential Milestone";
  return "Goal";
}

function DownArrow() {
  return (
    <div className="flex justify-start pl-4">
      <span className="text-slate-600">↓</span>
    </div>
  );
}

function PathStep({ icon, label, title, isQuest = false }: Readonly<{ icon?: string; label: string; title: string; isQuest?: boolean }>) {
  return (
    <div className={"rounded-xl border px-3 py-2.5 " + (isQuest ? "border-emerald-400/40 bg-emerald-500/10" : "border-slate-800 bg-slate-950/50")}>
      <p className={"text-[10px] font-semibold uppercase tracking-[0.14em] " + (isQuest ? "text-emerald-300" : "text-slate-500")}>
        {icon ? `${icon} ` : ""}
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-white">{title}</p>
    </div>
  );
}

export default function QuestPlanningPath({ quest, goalTree }: QuestPlanningPathProps) {
  if (!quest.linkedProgressGoalId) {
    return (
      <div className="border-b border-slate-800 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Why This Quest</p>
        <p className="mt-2 text-sm text-slate-500">No planning path linked</p>
      </div>
    );
  }

  const chain = getAncestorChainForQuest(goalTree, quest);

  if (!chain || chain.length === 0) {
    return (
      <div className="border-b border-slate-800 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Why This Quest</p>
        <p className="mt-2 text-sm text-slate-500">Planning milestone unavailable</p>
      </div>
    );
  }

  return (
    <div className="border-b border-slate-800 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Why This Quest</p>
      <div className="mt-3 space-y-1.5">
        {chain.map((node, index) => (
          <Fragment key={node.id}>
            {index > 0 ? <DownArrow /> : null}
            <PathStep icon={node.type === "dream" ? "🎯" : undefined} label={getNodeRoleLabel(node)} title={node.title} />
          </Fragment>
        ))}
        <DownArrow />
        <PathStep icon="✓" label="Selected Quest" title={quest.title} isQuest />
      </div>
    </div>
  );
}
