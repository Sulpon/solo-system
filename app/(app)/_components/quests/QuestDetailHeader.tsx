"use client";

import { useEffect, useState } from "react";
import { useAttributes } from "../../_lib/hooks/useAttributes";
import { calculateQuestStreak } from "../../_lib/daily-system";
import QuestIcon, { getQuestIconKey } from "./QuestIcon";
import { formatSchedule } from "./QuestList";
import type { Quest, QuestCompletion } from "../../_lib/types/quest";

type QuestDetailHeaderProps = Readonly<{
  quest: Quest;
  completions: ReadonlyArray<QuestCompletion>;
  onClose: () => void;
  onEdit: (quest: Quest) => void;
  onToggleStatus: (quest: Quest) => void;
  onDelete: (questId: string) => void;
}>;

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

export default function QuestDetailHeader({ quest, completions, onClose, onEdit, onToggleStatus, onDelete }: QuestDetailHeaderProps) {
  const { attributes: categories } = useAttributes();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    function close() {
      setMenuOpen(false);
    }
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [menuOpen]);

  const categoryName = categories.find((category) => category.id === quest.categoryId)?.name ?? quest.categoryId;
  const streak = calculateQuestStreak(quest, completions);
  const iconKey = getQuestIconKey(quest.title);

  return (
    <div className="border-b border-slate-800 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-200">
            <QuestIcon iconKey={iconKey} className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black text-white">{quest.title}</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {categoryName} · {formatSchedule(quest)}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-purple-200">+{quest.xp} XP</span>
              {streak > 0 ? (
                <span className="flex items-center gap-1 text-orange-300">
                  🔥 <span className="font-semibold">{streak}</span> day streak
                </span>
              ) : null}
              {quest.status === "archived" ? <span className="rounded-full border border-slate-700 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-slate-400">Archived</span> : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <div className="relative">
            <button type="button" onClick={() => setMenuOpen((current) => !current)} aria-label="More options" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-800/60 hover:text-white">
              <KebabIcon />
            </button>
            {menuOpen ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(quest);
                    }}
                    className="block w-full px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-slate-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onToggleStatus(quest);
                    }}
                    className="block w-full px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-slate-800"
                  >
                    {quest.status === "active" ? "Archive" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
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

          <button type="button" onClick={onClose} aria-label="Close quest details" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-800/60 hover:text-white">
            <CloseIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
