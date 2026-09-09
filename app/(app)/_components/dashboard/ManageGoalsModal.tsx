"use client";

import { useMemo, useState } from "react";
import Modal from "../Modal";
import { flattenGoalTree } from "../../_lib/goal-tree-storage";
import type { GoalTree } from "../../_lib/types/goal-tree";

const labelClass = "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500";

type ManageGoalsModalProps = Readonly<{
  goalTree: GoalTree;
  selectedIds: ReadonlyArray<string>;
  onSave: (ids: ReadonlyArray<string>) => void;
  onClose: () => void;
}>;

// Selection only - no goal creation here. The Goal Tree (goal-tree-storage.ts)
// is the only place Goals are ever created; this just picks which existing
// GoalNode ids the Dashboard widget displays.
export default function ManageGoalsModal({ goalTree, selectedIds, onSave, onClose }: ManageGoalsModalProps) {
  const [checked, setChecked] = useState(new Set(selectedIds));
  const nodes = useMemo(() => flattenGoalTree(goalTree), [goalTree]);

  function toggle(id: string) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Modal title="Manage Goals" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className={labelClass}>Goals</p>
          {/* Capped and independently scrollable - same reasoning as
              Manage Streaks/Achievements: a large Goal Tree must never push
              the Save/Cancel footer below what's reachable without
              scrolling. */}
          <div className="mt-2 max-h-[40vh] space-y-1.5 overflow-y-auto pr-1">
            {nodes.length === 0 ? (
              <p className="text-sm text-slate-500">No goals yet - create one in the Goal Tree first.</p>
            ) : (
              nodes.map((node) => (
                <label key={node.id} className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-950/45 px-3 py-2">
                  <input type="checkbox" checked={checked.has(node.id)} onChange={() => toggle(node.id)} className="accent-cyan-500" />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{node.title}</span>
                  {node.status === "completed" ? <span className="shrink-0 text-[10px] uppercase tracking-[0.08em] text-emerald-400">Completed</span> : null}
                </label>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(Array.from(checked));
              onClose();
            }}
            className="rounded-xl border border-cyan-400/50 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
