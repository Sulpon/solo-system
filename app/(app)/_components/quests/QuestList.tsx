"use client";

import { useAttributes } from "../../_lib/hooks/useAttributes";
import { isQuestScheduledForDate } from "../../_lib/daily-system";
import type { Quest, QuestCadence, QuestStatus } from "../../_lib/types/quest";

type QuestListProps = Readonly<{
  quests: Quest[];
  completedTodayIds?: ReadonlySet<string>;
  onEdit: (quest: Quest) => void;
  onToggleStatus: (quest: Quest) => void;
  onDelete: (questId: string) => void;
  onComplete: (quest: Quest) => void;
}>;

function formatCadence(cadence: QuestCadence) {
  return cadence.replace("-", " ");
}

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function formatSchedule(quest: Quest) {
  const days = quest.scheduledDays ?? [];

  if (days.length === 0) {
    return "Every day";
  }

  return days.map((day) => weekdayLabels[day] ?? "").filter(Boolean).join(", ");
}

export default function QuestList({ quests, completedTodayIds, onEdit, onToggleStatus, onDelete, onComplete }: QuestListProps) {
  const { attributes: categories } = useAttributes();

  function getCategoryName(id: Quest["categoryId"]) {
    return categories.find((category) => category.id === id)?.name ?? id;
  }

  return (
    <div className="mt-5 space-y-3">
      {quests.map((quest) => (
        <div key={quest.id} className="grid gap-4 rounded-xl border border-slate-800 bg-slate-950/45 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-white">{quest.title}</h3>
              <span className="rounded-full border border-purple-500/25 bg-purple-500/10 px-2 py-1 text-xs text-purple-200">{quest.xp} XP</span>
              <span
                className={
                  (quest.importance ?? "core") === "core"
                    ? "rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2 py-1 text-xs font-semibold text-cyan-100"
                    : "rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-xs font-semibold text-amber-100"
                }
              >
                {(quest.importance ?? "core") === "core" ? "Core" : "Bonus"}
              </span>
              <span className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300">{formatCadence(quest.cadence)}</span>
              <span className={quest.status === "active" ? "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200" : "rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-400"}>{quest.status}</span>
              <span className="rounded-full border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-300">{formatSchedule(quest)}</span>
              {quest.linkedProgressGoalId ? <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2 py-1 text-xs text-cyan-100">Linked Goal</span> : null}
            </div>
            <p className="mt-2 text-sm text-slate-400">{quest.description}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{getCategoryName(quest.categoryId)}</p>
            {quest.attributeXPOverride && quest.attributeXPOverride.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {quest.attributeXPOverride.map((reward) => {
                  const category = categories.find((item) => item.id === reward.attributeId);

                  return (
                    <span key={reward.attributeId} className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-2 py-1 text-xs text-cyan-100">
                      {category?.name ?? reward.attributeId} +{reward.xp} XP
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {completedTodayIds?.has(quest.id) ? (
              <span className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-200">Done today</span>
            ) : isQuestScheduledForDate(quest) ? (
              <button type="button" onClick={() => onComplete(quest)} className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 transition hover:border-emerald-300 hover:text-white">
                Mark Complete
              </button>
            ) : (
              <span className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-500">Not scheduled today</span>
            )}
            <button type="button" onClick={() => onEdit(quest)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-purple-400/60 hover:text-white">
              Edit
            </button>
            <button type="button" onClick={() => onToggleStatus(quest)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-cyan-400/60 hover:text-white">
              {quest.status === "active" ? "Archive" : "Activate"}
            </button>
            <button type="button" onClick={() => onDelete(quest.id)} className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 transition hover:border-rose-300 hover:text-white">
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
