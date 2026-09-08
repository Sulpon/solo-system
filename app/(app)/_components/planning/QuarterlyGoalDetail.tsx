"use client";

import Card from "../Card";
import { formatDateRange, getMonthlyMilestones } from "../../_lib/engines/planning-engine";
import { parseLocalDayKey } from "../../_lib/local-day";
import type { GoalNode, KeyResult } from "../../_lib/types/goal-tree";
import type { Quest } from "../../_lib/types/quest";
import KeyResultsEditor from "./KeyResultsEditor";
import MonthlyMilestoneCard from "./MonthlyMilestoneCard";

type QuarterlyGoalDetailProps = Readonly<{
  quarterlyGoal: GoalNode;
  dream: GoalNode | null;
  quests: ReadonlyArray<Quest>;
  onBack: () => void;
  onUpdateKeyResults: (keyResults: ReadonlyArray<KeyResult>) => void;
  onAddMonthlyMilestone: () => void;
  onAddWeeklyMilestone: (monthlyMilestone: GoalNode) => void;
  onAddQuest: (weeklyMilestone: GoalNode) => void;
}>;

export default function QuarterlyGoalDetail({ quarterlyGoal, dream, quests, onBack, onUpdateKeyResults, onAddMonthlyMilestone, onAddWeeklyMilestone, onAddQuest }: QuarterlyGoalDetailProps) {
  const monthlyMilestones = getMonthlyMilestones(quarterlyGoal);

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white">
        ← Back to Planning
      </button>

      <Card className="p-5">
        {dream ? <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">🎯 {dream.title}</p> : null}
        <h1 className="mt-1.5 text-2xl font-black text-white">{quarterlyGoal.title}</h1>
        {quarterlyGoal.description ? <p className="mt-2 text-sm text-slate-400">{quarterlyGoal.description}</p> : null}
        {quarterlyGoal.periodStart && quarterlyGoal.periodEnd ? (
          <p className="mt-2 text-xs text-slate-500">{formatDateRange(parseLocalDayKey(quarterlyGoal.periodStart), parseLocalDayKey(quarterlyGoal.periodEnd))}</p>
        ) : null}

        <div className="mt-4 flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-900">
            <div className="h-full rounded-full bg-gradient-to-r from-purple-400 to-cyan-400" style={{ width: `${Math.min(100, Math.max(0, quarterlyGoal.progress))}%` }} />
          </div>
          <span className="shrink-0 text-lg font-black text-white">{quarterlyGoal.progress}%</span>
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Key Results</p>
        <p className="mt-1 text-xs text-slate-500">A separate OKR scoreboard - never part of this goal&apos;s progress bar above, which always comes from Monthly Milestones.</p>
        <div className="mt-3">
          <KeyResultsEditor keyResults={quarterlyGoal.keyResults ?? []} onChange={onUpdateKeyResults} />
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Monthly Plan</p>
          <button type="button" onClick={onAddMonthlyMilestone} className="rounded-lg border border-purple-400/50 bg-purple-500/15 px-3 py-1.5 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/25">
            + Add Monthly Milestone
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {monthlyMilestones.length === 0 ? (
            <p className="text-sm text-slate-500">No monthly milestones yet. Break this goal into months to get started.</p>
          ) : (
            monthlyMilestones.map((monthly) => (
              <MonthlyMilestoneCard key={monthly.id} monthlyMilestone={monthly} quests={quests} onAddWeeklyMilestone={onAddWeeklyMilestone} onAddQuest={onAddQuest} />
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
