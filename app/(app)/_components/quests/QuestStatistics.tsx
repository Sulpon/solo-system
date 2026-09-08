"use client";

import { getQuestDetailStats } from "../../_lib/engines/quest-calendar-engine";
import type { Quest, QuestCompletion } from "../../_lib/types/quest";

type QuestStatisticsProps = Readonly<{
  quest: Quest;
  completions: ReadonlyArray<QuestCompletion>;
}>;

export default function QuestStatistics({ quest, completions }: QuestStatisticsProps) {
  const stats = getQuestDetailStats(quest, completions);

  const cards: ReadonlyArray<{ label: string; value: string; accent: string }> = [
    { label: "Current Streak", value: `${stats.currentStreak} days`, accent: "text-orange-300" },
    { label: "Longest Streak", value: `${stats.longestStreak} days`, accent: "text-orange-200" },
    { label: "Completion Rate", value: `${stats.completionRatePercent}%`, accent: "text-emerald-300" },
    { label: "Total Completions", value: `${stats.totalCompletions} / ${stats.totalScheduledDays}`, accent: "text-cyan-300" },
    { label: "Total XP Earned", value: `${stats.totalXpEarned.toLocaleString()} XP`, accent: "text-purple-200" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{card.label}</p>
          <p className={"mt-1.5 text-xl font-black " + card.accent}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
