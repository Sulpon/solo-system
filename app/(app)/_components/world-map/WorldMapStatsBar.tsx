"use client";

import { getWorldStatistics } from "../../_lib/engines/world-map-engine";
import type { GoalTree } from "../../_lib/types/goal-tree";

type WorldMapStatsBarProps = Readonly<{ goalTree: GoalTree }>;

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2">
      <span className="text-sm font-black text-white">{value}</span>
      <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
    </div>
  );
}

export default function WorldMapStatsBar({ goalTree }: WorldMapStatsBarProps) {
  const stats = getWorldStatistics(goalTree);

  return (
    <div className="flex flex-wrap gap-2.5">
      <StatChip label="Countries Discovered" value={`${stats.countriesDiscovered} / ${stats.countriesTotal}`} />
      <StatChip label="Countries Conquered" value={String(stats.countriesConquered)} />
      <StatChip label="Continents Explored" value={`${stats.continentsExplored} / ${stats.continentsTotal}`} />
      <StatChip label="World Progress" value={`${stats.worldProgressPercent}%`} />
      <StatChip label="Active Goals" value={String(stats.activeGoalsCount)} />
      <StatChip label="Milestones Completed" value={String(stats.milestonesCompletedCount)} />
    </div>
  );
}
