"use client";

import Card from "../Card";
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
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">Bonus Missions</p>
          <h2 className="mt-1 text-xl font-black text-white">{unlocked ? `${completedCount} / ${quests.length} optional` : "Locked"}</h2>
        </div>
        <span className={unlocked ? "rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-100" : "rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs font-semibold text-slate-400"}>
          {unlocked ? "Unlocked" : "Core first"}
        </span>
      </div>

      {!unlocked ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-5 text-sm text-slate-400">
          Bonus Missions Locked. Complete your Minimum Successful Day to unlock optional missions.
        </div>
      ) : quests.length > 0 ? (
        <div className="mt-5 space-y-3">
          {quests.map((quest) => {
            const completed = completedQuestIds.has(quest.id);

            return (
              <button
                key={quest.id}
                type="button"
                onClick={() => onToggleQuest(quest, completed)}
                className={
                  "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition " +
                  (completed
                    ? "border-amber-400/40 bg-amber-400/10 text-white"
                    : "border-slate-800 bg-slate-950/45 text-slate-300 hover:border-amber-400/35 hover:text-white")
                }
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{quest.title}</span>
                  {quest.description ? <span className="mt-1 block truncate text-xs text-slate-500">{quest.description}</span> : null}
                </span>
                <span className="shrink-0 text-sm font-semibold text-amber-200">+{quest.xp} XP</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-5 text-sm text-slate-400">
          No bonus missions yet. Optional quests can be added from the Quest Manager.
        </div>
      )}
    </Card>
  );
}
