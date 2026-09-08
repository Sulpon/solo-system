"use client";

import { getQuestsForWeeklyMilestone, getWeeklyMilestones } from "../../_lib/engines/planning-engine";
import type { GoalNode } from "../../_lib/types/goal-tree";
import type { Quest } from "../../_lib/types/quest";
import WeeklyMilestoneCard from "./WeeklyMilestoneCard";

type MonthlyMilestoneCardProps = Readonly<{
  monthlyMilestone: GoalNode;
  quests: ReadonlyArray<Quest>;
  onAddWeeklyMilestone: (monthlyMilestone: GoalNode) => void;
  onAddQuest: (weeklyMilestone: GoalNode) => void;
}>;

export default function MonthlyMilestoneCard({ monthlyMilestone, quests, onAddWeeklyMilestone, onAddQuest }: MonthlyMilestoneCardProps) {
  const weeklyMilestones = getWeeklyMilestones(monthlyMilestone);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-white">{monthlyMilestone.title}</p>
          {monthlyMilestone.description ? <p className="mt-0.5 text-xs text-slate-400">{monthlyMilestone.description}</p> : null}
        </div>
        <span className="shrink-0 text-sm font-semibold text-emerald-300">{monthlyMilestone.progress}%</span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ width: `${Math.min(100, Math.max(0, monthlyMilestone.progress))}%` }} />
      </div>

      <div className="mt-3 space-y-2.5">
        {weeklyMilestones.length === 0 ? (
          <p className="text-xs text-slate-500">No weekly milestones yet.</p>
        ) : (
          weeklyMilestones.map((weekly) => <WeeklyMilestoneCard key={weekly.id} weeklyMilestone={weekly} quests={getQuestsForWeeklyMilestone(weekly, quests)} onAddQuest={() => onAddQuest(weekly)} />)
        )}
      </div>

      <button type="button" onClick={() => onAddWeeklyMilestone(monthlyMilestone)} className="mt-3 text-xs font-semibold text-purple-300 transition hover:text-purple-200">
        + Add Weekly Milestone
      </button>
    </div>
  );
}
