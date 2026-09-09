"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { flattenGoalNodes } from "../../_lib/engines/library-engine";
import type { GoalTree } from "../../_lib/types/goal-tree";

type LibraryLinkedGoalsProps = Readonly<{
  goalTree: GoalTree;
  linkedGoalIds: ReadonlyArray<string>;
  onLink: (goalId: string) => void;
  onUnlink: (goalId: string) => void;
}>;

// Multi-link variant of the pattern QuestLinkedGoals.tsx established for a
// single link - a media item can reasonably relate to more than one life
// area (a book might inform both "Financial Discipline" and "Self
// Development"). Offers any Goal Tree node (Dream through Weekly Milestone),
// not just progress_goal nodes, since the example goals in the spec read as
// broad Dreams/Long-term Goals rather than numeric progress targets.
export default function LibraryLinkedGoals({ goalTree, linkedGoalIds, onLink, onUnlink }: LibraryLinkedGoalsProps) {
  const [picking, setPicking] = useState(false);
  const allNodes = useMemo(() => flattenGoalNodes(goalTree), [goalTree]);
  const linkedNodes = linkedGoalIds.map((id) => allNodes.find((node) => node.id === id)).filter((node) => Boolean(node));
  const availableNodes = allNodes.filter((node) => !linkedGoalIds.includes(node.id));

  return (
    <div className="border-t border-slate-800 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Linked Goals</p>
        {availableNodes.length > 0 && !picking ? (
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
              if (event.target.value) onLink(event.target.value);
              setPicking(false);
            }}
            className="rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-purple-400"
          >
            <option value="" disabled>
              Select a goal...
            </option>
            {availableNodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.title}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setPicking(false)} className="text-xs text-slate-500 transition hover:text-white">
            Cancel
          </button>
        </div>
      ) : null}

      {linkedNodes.length === 0 && !picking ? <p className="mt-3 text-sm text-slate-500">No goals linked yet.</p> : null}

      {linkedNodes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {linkedNodes.map((node) => (
            <div key={node!.id} className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/50 py-1 pl-3 pr-1.5 text-xs">
              <Link href="/goals" className="font-semibold text-white hover:text-purple-200">
                {node!.title}
              </Link>
              <button type="button" onClick={() => onUnlink(node!.id)} className="text-slate-500 transition hover:text-rose-300" aria-label={`Unlink ${node!.title}`}>
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
