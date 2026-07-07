"use client";

import Card from "../Card";
import Progress from "../Progress";
import DailyProgressRing from "./DailyProgressRing";
import type { Quest } from "../../_lib/types/quest";

type MinimumSuccessfulDayCardProps = Readonly<{
  quests: ReadonlyArray<Quest>;
  completedQuestIds: ReadonlySet<string>;
  successPercent: number;
  onToggleQuest: (quest: Quest, completed: boolean) => void;
}>;

export default function MinimumSuccessfulDayCard({ quests, completedQuestIds, successPercent, onToggleQuest }: MinimumSuccessfulDayCardProps) {
  const completedCount = quests.filter((quest) => completedQuestIds.has(quest.id)).length;
  const dayWon = quests.length > 0 && completedCount === quests.length;

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Minimum Successful Day</p>
          <h2 className="mt-1 text-2xl font-black text-white">{completedCount} / {quests.length} complete</h2>
          <p className="mt-2 text-sm text-slate-400">
            {dayWon ? "Day won. Optional tasks unlocked." : quests.length === 0 ? "Create a core daily quest to define what makes today count." : "Minimum not complete yet. Keep the target small and meaningful."}
          </p>
        </div>
        <DailyProgressRing value={successPercent} />
      </div>

      <div className="mt-5">
        <Progress
          value={successPercent}
          max={100}
          className="h-3 overflow-hidden rounded-full bg-slate-950/80"
          fillClassName="h-full bg-gradient-to-r from-cyan-400 to-purple-500"
        />
      </div>

      <div className="mt-5 space-y-3">
        {quests.length > 0 ? (
          quests.map((quest) => {
            const completed = completedQuestIds.has(quest.id);

            return (
              <button
                key={quest.id}
                type="button"
                onClick={() => onToggleQuest(quest, completed)}
                className={
                  "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition " +
                  (completed
                    ? "border-cyan-400/40 bg-cyan-400/10 text-white"
                    : "border-slate-800 bg-slate-950/45 text-slate-300 hover:border-cyan-400/35 hover:text-white")
                }
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{quest.title}</span>
                  {quest.description ? <span className="mt-1 block truncate text-xs text-slate-500">{quest.description}</span> : null}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold text-purple-200">+{quest.xp} XP</span>
                  <span className={completed ? "text-cyan-200" : "text-slate-500"}>{completed ? "Done" : "Open"}</span>
                </span>
              </button>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-5 text-sm text-slate-400">
            No core quests yet. Create one daily core quest to start the loop.
          </div>
        )}
      </div>
    </Card>
  );
}
