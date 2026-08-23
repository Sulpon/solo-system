"use client";

import { useMemo, useState } from "react";
import { getConsistencyStats, getInsights } from "../../_lib/engines/chronicle-engine";
import { getLocalDayKey } from "../../_lib/local-day";
import type { ChronicleContext } from "../../_lib/engines/chronicle-engine";

type StatsInsightsViewProps = Readonly<{
  context: ChronicleContext;
}>;

type RangeMode = "month" | "year" | "all";

const RANGE_OPTIONS: ReadonlyArray<{ mode: RangeMode; label: string }> = [
  { mode: "month", label: "This Month" },
  { mode: "year", label: "This Year" },
  { mode: "all", label: "All Time" },
];

function getRangeStart(mode: RangeMode, today: Date, earliestDate: string): string {
  const start = new Date(today);
  if (mode === "month") start.setDate(1);
  if (mode === "year") { start.setMonth(0); start.setDate(1); }
  if (mode === "all") return earliestDate;
  const startKey = getLocalDayKey(start);
  return startKey > earliestDate ? startKey : earliestDate;
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
      {sub ? <p className="text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

export default function StatsInsightsView({ context }: StatsInsightsViewProps) {
  const [rangeMode, setRangeMode] = useState<RangeMode>("month");
  const today = useMemo(() => new Date(), []);
  const todayKey = getLocalDayKey(today);
  const earliestQuestDate = context.quests.reduce((earliest, quest) => (quest.createdAt && (!earliest || quest.createdAt < earliest) ? getLocalDayKey(quest.createdAt) : earliest), "" as string);
  const earliestDate = earliestQuestDate || todayKey;
  const startDate = getRangeStart(rangeMode, today, earliestDate);

  const stats = getConsistencyStats(startDate, todayKey, context);
  const insights = getInsights(startDate, todayKey, context);
  const maxCategoryXp = Math.max(1, ...stats.categoryBreakdown.map((entry) => entry.xp));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-purple-500/25 bg-slate-950/55 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black text-white">Stats &amp; Insights</h2>
          <div className="flex gap-2">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.mode}
                type="button"
                onClick={() => setRangeMode(option.mode)}
                className={
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition " +
                  (rangeMode === option.mode ? "border-purple-400/60 bg-purple-500/15 text-purple-100" : "border-slate-700 bg-slate-950/60 text-slate-400 hover:border-purple-400/40 hover:text-white")
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Completion Consistency" value={`${stats.completionConsistencyPercent}%`} sub="% of scheduled quests completed" />
          <StatTile label="Average Daily XP" value={stats.averageDailyXp.toLocaleString()} />
          <StatTile label="Best Streak" value={stats.bestStreak ? `${stats.bestStreak.days}d` : "—"} sub={stats.bestStreak?.questTitle} />
          <StatTile label="Most Active Month" value={stats.mostActiveMonthLabel ?? "—"} />
          <StatTile label="Workouts / Week" value={stats.workoutsPerWeek.toString()} />
          <StatTile label="Challenge Success Rate" value={stats.challengeCompletionRatePercent === null ? "—" : `${stats.challengeCompletionRatePercent}%`} />
          <StatTile label="Best Day" value={stats.bestDay ? `+${stats.bestDay.xpEarned.toLocaleString()} XP` : "—"} sub={stats.bestDay?.date} />
        </div>
      </div>

      {stats.weeklyTrend.length > 1 ? (
        <div className="rounded-2xl border border-purple-500/25 bg-slate-950/55 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">Completion Consistency Trend</p>
          <div className="mt-4 flex h-32 items-end gap-1.5">
            {stats.weeklyTrend.map((point) => (
              <div key={point.label} className="flex-1" title={`${point.label}: ${point.percent}%`}>
                <div className="rounded-t bg-gradient-to-t from-purple-600 to-cyan-400" style={{ height: `${Math.max(4, point.percent)}%` }} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {stats.categoryBreakdown.length > 0 ? (
        <div className="rounded-2xl border border-purple-500/25 bg-slate-950/55 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">Completion by Category</p>
          <div className="mt-4 space-y-2.5">
            {stats.categoryBreakdown.map((entry) => (
              <div key={entry.categoryId}>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{entry.categoryName}</span>
                  <span className="font-semibold text-slate-300">{entry.percent}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-900">
                  <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400" style={{ width: `${Math.max(2, (entry.xp / maxCategoryXp) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-purple-500/25 bg-slate-950/55 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">Insights</p>
        {insights.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Not enough data yet in this range for a reliable insight.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {insights.map((insight) => (
              <li key={insight.id} className="text-sm text-slate-300">
                {insight.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
