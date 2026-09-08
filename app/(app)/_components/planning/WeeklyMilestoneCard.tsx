"use client";

import Link from "next/link";
import { formatDateRange } from "../../_lib/engines/planning-engine";
import { parseLocalDayKey } from "../../_lib/local-day";
import type { GoalNode } from "../../_lib/types/goal-tree";
import type { Quest } from "../../_lib/types/quest";

type WeeklyMilestoneCardProps = Readonly<{
  weeklyMilestone: GoalNode;
  quests: ReadonlyArray<Quest>;
  onAddQuest: () => void;
}>;

export default function WeeklyMilestoneCard({ weeklyMilestone, quests, onAddQuest }: WeeklyMilestoneCardProps) {
  const current = weeklyMilestone.currentValue ?? 0;
  const target = weeklyMilestone.targetValue ?? 1;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{weeklyMilestone.title}</p>
          {weeklyMilestone.periodStart && weeklyMilestone.periodEnd ? (
            <p className="text-[11px] text-slate-500">{formatDateRange(parseLocalDayKey(weeklyMilestone.periodStart), parseLocalDayKey(weeklyMilestone.periodEnd))}</p>
          ) : null}
        </div>
        <span className="shrink-0 text-xs font-semibold text-cyan-300">
          {current} / {target} {weeklyMilestone.unit ?? ""} · {weeklyMilestone.progress}%
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-900">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-400" style={{ width: `${Math.min(100, Math.max(0, weeklyMilestone.progress))}%` }} />
      </div>

      <div className="mt-3 space-y-1.5">
        {quests.length === 0 ? (
          <p className="text-xs text-slate-500">No quests linked yet.</p>
        ) : (
          quests.map((quest) => (
            <div key={quest.id} className="flex items-center justify-between rounded-lg border border-slate-800/70 bg-slate-950/40 px-2.5 py-1.5 text-xs">
              <span className="min-w-0 truncate text-slate-200">{quest.title}</span>
              <span className="shrink-0 text-purple-200">+{quest.xp} XP</span>
            </div>
          ))
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <button type="button" onClick={onAddQuest} className="text-xs font-semibold text-purple-300 transition hover:text-purple-200">
          + Add Quest
        </button>
        {quests.length > 0 ? (
          <Link href="/quests" className="text-[11px] text-slate-500 transition hover:text-white">
            View in Quests →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
