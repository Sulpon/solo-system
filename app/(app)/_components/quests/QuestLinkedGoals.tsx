"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { calculateGoalTree, findGoalNodeView } from "../../_lib/goal-tree-progress";
import type { GoalNode, GoalTree } from "../../_lib/types/goal-tree";
import type { Quest } from "../../_lib/types/quest";

type QuestLinkedGoalsProps = Readonly<{
  quest: Quest;
  goalTree: GoalTree;
  progressGoals: ReadonlyArray<GoalNode>;
  onLinkGoal: (goalId: string | null) => void;
}>;

export default function QuestLinkedGoals({ quest, goalTree, progressGoals, onLinkGoal }: QuestLinkedGoalsProps) {
  const [picking, setPicking] = useState(false);

  const linkedGoalView = useMemo(() => {
    if (!quest.linkedProgressGoalId) {
      return null;
    }
    return findGoalNodeView(calculateGoalTree(goalTree), quest.linkedProgressGoalId);
  }, [quest.linkedProgressGoalId, goalTree]);

  return (
    <div className="border-t border-slate-800 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Linked Goals</p>
        {!quest.linkedProgressGoalId && !picking ? (
          <button type="button" onClick={() => setPicking(true)} className="rounded-lg border border-purple-400/50 bg-purple-500/15 px-3 py-1.5 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/25">
            + Link Goal
          </button>
        ) : null}
      </div>

      {picking ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                onLinkGoal(event.target.value);
              }
              setPicking(false);
            }}
            className="rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-purple-400"
          >
            <option value="" disabled>
              Select a goal...
            </option>
            {progressGoals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setPicking(false)} className="text-xs text-slate-500 transition hover:text-white">
            Cancel
          </button>
        </div>
      ) : null}

      {!quest.linkedProgressGoalId && !picking ? (
        <p className="mt-3 text-sm text-slate-500">No goal linked yet. Completing this quest can contribute progress toward a Goal you choose.</p>
      ) : null}

      {linkedGoalView ? (
        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <div className="flex items-center justify-between gap-3">
            <Link href="/goals" className="min-w-0 truncate text-sm font-semibold text-white hover:text-purple-200">
              {linkedGoalView.title}
            </Link>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-xs font-semibold text-cyan-300">{linkedGoalView.progress}%</span>
              <button type="button" onClick={() => onLinkGoal(null)} className="text-xs text-slate-500 transition hover:text-rose-300">
                Unlink
              </button>
            </div>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-400" style={{ width: `${Math.min(100, Math.max(0, linkedGoalView.progress))}%` }} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
