"use client";

import Card from "../Card";
import Progress from "../Progress";
import { useProgression } from "../../_lib/hooks/useProgression";
import { getRankLabel } from "../../_lib/engines/level-engine";

// The one always-live, non-personalized piece of the top section - Level/XP
// has no "which one to show" choice, so unlike Streaks/Achievements/Goal
// Progress it needs no Manage control or Dashboard preference of its own.
export default function LevelXpBar() {
  const { progressionSummary } = useProgression();
  const xpTarget = progressionSummary.xpInCurrentLevel + progressionSummary.xpNeededForNextLevel;

  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 p-4" testId="dashboard-level-xp-bar">
      <div className="flex shrink-0 items-baseline gap-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-purple-300">{getRankLabel(progressionSummary.currentLevel)}</span>
        <span className="text-xl font-black text-white">Level {progressionSummary.currentLevel}</span>
      </div>
      <div className="flex min-w-[220px] flex-1 items-center gap-3">
        <Progress
          value={progressionSummary.xpInCurrentLevel}
          max={Math.max(1, xpTarget)}
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-900"
          fillClassName="h-full bg-gradient-to-r from-purple-500 to-cyan-400"
        />
        <span className="shrink-0 text-sm font-semibold text-slate-300">
          {progressionSummary.xpInCurrentLevel.toLocaleString()} / {xpTarget.toLocaleString()} XP
        </span>
      </div>
    </Card>
  );
}
