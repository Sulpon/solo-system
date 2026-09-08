"use client";

import { getQuestRecentActivity } from "../../_lib/engines/quest-calendar-engine";
import type { Quest, QuestCompletion } from "../../_lib/types/quest";

type QuestRecentActivityProps = Readonly<{
  quest: Quest;
  completions: ReadonlyArray<QuestCompletion>;
}>;

export default function QuestRecentActivity({ quest, completions }: QuestRecentActivityProps) {
  const entries = getQuestRecentActivity(quest, completions, 14);

  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">No activity yet.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.slice(0, 10).map((entry) => (
        <div key={entry.dayKey} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
          <span className={"flex items-center gap-1.5 font-semibold " + (entry.status === "completed" ? "text-emerald-300" : "text-rose-300")}>
            {entry.status === "completed" ? "✓ Completed" : "✕ Missed"}
          </span>
          <span className="text-xs text-slate-500">
            {entry.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            {entry.status === "completed" && entry.completion ? `, ${new Date(entry.completion.completedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}` : ""}
          </span>
          <span className={"text-xs font-semibold " + (entry.status === "completed" ? "text-purple-200" : "text-slate-600")}>
            {entry.status === "completed" && entry.completion ? `+${entry.completion.xpAwarded} XP` : "0 XP"}
          </span>
        </div>
      ))}
    </div>
  );
}
