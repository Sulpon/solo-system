"use client";

import Card from "../Card";
import FocusButton from "../focus/FocusButton";
import type { Quest } from "../../_lib/types/quest";

type BonusMissionsCardProps = Readonly<{
  quests: ReadonlyArray<Quest>;
  unlocked: boolean;
  completedQuestIds: ReadonlySet<string>;
  onToggleQuest: (quest: Quest, completed: boolean) => void;
}>;

export default function BonusMissionsCard({ quests, unlocked, completedQuestIds, onToggleQuest }: BonusMissionsCardProps) {
  const completedCount = quests.filter((quest) => completedQuestIds.has(quest.id)).length;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">Optional Tasks</p>
          <h2 className="mt-1 text-xl font-black text-white">{unlocked ? `${completedCount} / ${quests.length} optional` : "Locked"}</h2>
        </div>
        <span className={unlocked ? "rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-100" : "rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs font-semibold text-slate-400"}>
          {unlocked ? "Unlocked" : "Core first"}
        </span>
      </div>

      {!unlocked ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-5 text-sm text-slate-400">
          Optional Tasks are locked. Complete your Minimum Successful Day to unlock them.
        </div>
      ) : quests.length > 0 ? (
        <div className="mt-5 space-y-3">
          {quests.map((quest) => {
            const completed = completedQuestIds.has(quest.id);

            return (
              <div
                key={quest.id}
                className={
                  "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition " +
                  (completed
                    ? "border-amber-400/40 bg-amber-400/10 text-white"
                    : "border-slate-800 bg-slate-950/45 text-slate-300 hover:border-amber-400/35 hover:text-white")
                }
              >
                <button type="button" onClick={() => onToggleQuest(quest, completed)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{quest.title}</span>
                    {quest.description ? <span className="mt-1 block truncate text-xs text-slate-500">{quest.description}</span> : null}
                  </span>
                </button>
                <span className="flex shrink-0 items-center gap-3">
                  {!completed ? <FocusButton quest={{ id: quest.id, title: quest.title, linkedProgressGoalId: quest.linkedProgressGoalId }} compact /> : null}
                  <span className="text-sm font-semibold text-amber-200">+{quest.xp} XP</span>
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-5 text-sm text-slate-400">
          No optional tasks yet. Add one from Quest Manager.
        </div>
      )}
    </Card>
  );
}
