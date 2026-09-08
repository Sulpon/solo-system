"use client";

import Card from "../Card";
import { getMonthlyMilestones, type MonthRef } from "../../_lib/engines/planning-engine";
import { parseLocalDayKey } from "../../_lib/local-day";
import type { GoalNode } from "../../_lib/types/goal-tree";

type QuarterlyGoalCardProps = Readonly<{
  dream: GoalNode;
  quarterlyGoal: GoalNode;
  months: ReadonlyArray<MonthRef>;
  onSelect: () => void;
}>;

export default function QuarterlyGoalCard({ dream, quarterlyGoal, months, onSelect }: QuarterlyGoalCardProps) {
  const monthlyMilestones = getMonthlyMilestones(quarterlyGoal);
  const keyResults = quarterlyGoal.keyResults ?? [];

  return (
    <Card className="cursor-pointer p-5 transition hover:border-purple-400/50">
      <div onClick={onSelect}>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">🎯 {dream.title}</p>
        <h3 className="mt-1.5 text-lg font-black text-white">{quarterlyGoal.title}</h3>

        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-900">
            <div className="h-full rounded-full bg-gradient-to-r from-purple-400 to-cyan-400" style={{ width: `${Math.min(100, Math.max(0, quarterlyGoal.progress))}%` }} />
          </div>
          <span className="shrink-0 text-sm font-black text-white">{quarterlyGoal.progress}%</span>
        </div>

        {keyResults.length > 0 ? (
          <div className="mt-4 space-y-1.5">
            {keyResults.map((kr) => {
              const percent = Math.min(100, Math.round((kr.currentValue / Math.max(1, kr.targetValue)) * 100));
              return (
                <div key={kr.id} className="flex items-center justify-between text-xs">
                  <span className="min-w-0 truncate text-slate-300">{kr.title}</span>
                  <span className="shrink-0 font-semibold text-cyan-300">{percent}%</span>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="mt-4 space-y-1.5 border-t border-slate-800 pt-3">
          {months.map((month) => {
            const milestone = monthlyMilestones.find((node) => node.periodStart && parseLocalDayKey(node.periodStart).getMonth() === month.month && parseLocalDayKey(node.periodStart).getFullYear() === month.year);
            const progress = milestone?.progress ?? 0;
            return (
              <div key={month.label} className="flex items-center gap-2 text-xs">
                <span className="w-20 shrink-0 text-slate-400">{month.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-900">
                  <div className={"h-full rounded-full " + (milestone ? "bg-emerald-400" : "bg-slate-800")} style={{ width: `${progress}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right text-slate-500">{milestone ? `${progress}%` : "—"}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
