"use client";

import { useEffect, useState } from "react";
import { useAttributes } from "../../_lib/hooks/useAttributes";
import { isQuestScheduledForDate, calculateQuestStreak, calculateQuestConsistency } from "../../_lib/daily-system";
import type { Quest, QuestCompletion } from "../../_lib/types/quest";

type QuestListProps = Readonly<{
  quests: Quest[];
  questCompletions?: ReadonlyArray<QuestCompletion>;
  completedTodayIds?: ReadonlySet<string>;
  referenceDate?: Date;
  onEdit: (quest: Quest) => void;
  onToggleStatus: (quest: Quest) => void;
  onDelete: (questId: string) => void;
  onComplete: (quest: Quest) => void;
  onUndoComplete?: (quest: Quest) => void;
}>;

function formatSchedule(quest: Quest) {
  const days = quest.scheduledDays ?? [];

  if (days.length === 0) {
    return "Every day";
  }

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
  return days.map((day) => weekdayLabels[day] ?? "").filter(Boolean).join(", ");
}

function CheckmarkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="M4 10.5 8 14.5 16 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FlameIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M10.05 1.5c.3 2.02-.42 3.36-1.6 4.6C7.1 7.44 5.6 8.86 5.6 11.4a4.4 4.4 0 0 0 8.8 0c0-1.14-.36-1.98-.83-2.86-.16.94-.6 1.6-1.2 2.02.2-1.7-.45-2.9-1.53-3.98-.6-.6-1.2-1.32-1.3-2.3-.62.5-1.06 1.2-1.24 1.98-.5-.7-.66-1.68-.25-3.76Z" />
    </svg>
  );
}

function KebabIcon() {
  return (
    <svg viewBox="0 0 4 16" fill="currentColor" className="h-4 w-4">
      <circle cx="2" cy="2" r="1.6" />
      <circle cx="2" cy="8" r="1.6" />
      <circle cx="2" cy="14" r="1.6" />
    </svg>
  );
}

function ConsistencyRing({ percent }: { percent: number }) {
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference * (1 - clamped / 100);

  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 -rotate-90">
      <circle cx="16" cy="16" r={radius} fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-800" />
      <circle
        cx="16"
        cy="16"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-amber-300 transition-[stroke-dashoffset] duration-300"
      />
    </svg>
  );
}

export default function QuestList({
  quests,
  questCompletions = [],
  completedTodayIds,
  referenceDate = new Date(),
  onEdit,
  onToggleStatus,
  onDelete,
  onComplete,
  onUndoComplete,
}: QuestListProps) {
  const { attributes: categories } = useAttributes();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!openMenuId) {
      return;
    }

    function closeMenu() {
      setOpenMenuId(null);
    }

    window.addEventListener("scroll", closeMenu, true);
    return () => window.removeEventListener("scroll", closeMenu, true);
  }, [openMenuId]);

  function getCategoryName(id: Quest["categoryId"]) {
    return categories.find((category) => category.id === id)?.name ?? id;
  }

  return (
    <div className="mt-5 space-y-2">
      {quests.map((quest) => {
        const isCompleted = completedTodayIds?.has(quest.id) ?? false;
        const isScheduled = isQuestScheduledForDate(quest, referenceDate);
        const streak = calculateQuestStreak(quest, questCompletions, referenceDate);
        const consistency = calculateQuestConsistency(quest, questCompletions, referenceDate);
        const isCore = (quest.importance ?? "core") === "core";
        const menuOpen = openMenuId === quest.id;

        function toggleComplete() {
          if (isCompleted) {
            onUndoComplete?.(quest);
            return;
          }

          if (isScheduled) {
            onComplete(quest);
          }
        }

        return (
          <div
            key={quest.id}
            className={
              "flex items-center gap-3 rounded-lg border bg-slate-900/50 px-3 py-2 transition duration-150 " +
              (isCompleted
                ? "border-emerald-500/50 shadow-[0_0_14px_rgba(16,185,129,0.14)]"
                : "border-slate-800 hover:border-slate-700")
            }
          >
            <button
              type="button"
              onClick={toggleComplete}
              disabled={!isCompleted && !isScheduled}
              aria-label={isCompleted ? "Undo completion" : "Mark complete"}
              className={
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition " +
                (isCompleted
                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                  : isScheduled
                    ? "border-slate-600 text-transparent hover:border-emerald-400/60 hover:text-emerald-400/60"
                    : "cursor-not-allowed border-slate-800 text-transparent opacity-40")
              }
            >
              <CheckmarkIcon />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <h3 className="truncate text-sm font-bold text-white">{quest.title}</h3>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{getCategoryName(quest.categoryId)}</span>
                {quest.status === "archived" ? (
                  <span className="shrink-0 rounded-full border border-slate-700 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">Archived</span>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] leading-none">
                <span
                  className={
                    isCore
                      ? "rounded-full border border-cyan-400/25 bg-cyan-400/10 px-1.5 py-0.5 font-semibold text-cyan-200"
                      : "rounded-full border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 font-semibold text-amber-200"
                  }
                >
                  {isCore ? "Core" : "Bonus"}
                </span>
                <span className="rounded-full border border-slate-700 px-1.5 py-0.5 text-slate-400">{quest.cadence.replace("-", " ")}</span>
                <span className="rounded-full border border-slate-700 bg-slate-950/50 px-1.5 py-0.5 text-slate-400">{formatSchedule(quest)}</span>
                {quest.linkedProgressGoalId ? <span className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-1.5 py-0.5 text-cyan-200">Linked Goal</span> : null}
                {streak > 0 ? (
                  <span className="text-slate-500">
                    <span className="font-semibold text-orange-300">{streak}</span> day streak
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-4">
              <div className="flex w-10 flex-col items-center gap-0.5">
                <span className="flex items-center gap-1 text-sm font-bold text-orange-300">
                  <FlameIcon />
                  {streak}
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Streak</span>
              </div>

              <div className="flex w-10 flex-col items-center gap-0.5">
                <div className="relative flex h-8 w-8 items-center justify-center">
                  <ConsistencyRing percent={consistency} />
                  <span className="absolute text-[9px] font-bold text-white">{consistency}</span>
                </div>
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Consist.</span>
              </div>

              <div className="flex w-10 flex-col items-center gap-0.5">
                <span className="text-sm font-bold text-purple-200">{quest.xp}</span>
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">XP</span>
              </div>

              {isCompleted ? (
                <span className="rounded-full border border-emerald-400/50 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200">Logged</span>
              ) : isScheduled ? (
                <button
                  type="button"
                  onClick={() => onComplete(quest)}
                  className="rounded-full border border-emerald-500/50 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
                >
                  Log
                </button>
              ) : (
                <span className="rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1.5 text-xs text-slate-500">—</span>
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenuId(menuOpen ? null : quest.id)}
                  aria-label="More options"
                  className="flex h-8 w-6 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-800/60 hover:text-white"
                >
                  <KebabIcon />
                </button>

                {menuOpen ? (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                    <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuId(null);
                          onEdit(quest);
                        }}
                        className="block w-full px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-slate-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuId(null);
                          onToggleStatus(quest);
                        }}
                        className="block w-full px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-slate-800"
                      >
                        {quest.status === "active" ? "Archive" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuId(null);
                          onDelete(quest.id);
                        }}
                        className="block w-full px-3 py-2 text-left text-xs text-rose-300 transition hover:bg-rose-500/10"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
