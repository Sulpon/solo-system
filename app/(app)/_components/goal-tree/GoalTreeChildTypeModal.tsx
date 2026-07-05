"use client";

import Modal from "../Modal";
import type { GoalNodeType } from "../../_lib/types/goal-tree";

type GoalTreeChildTypeModalProps = Readonly<{
  parentTitle: string;
  defaultChildType: GoalNodeType;
  onChoose: (type: GoalNodeType) => void;
  onClose: () => void;
}>;

const buttonClass =
  "rounded-xl border px-4 py-3 text-left text-sm font-semibold transition hover:text-white";

function formatTypeLabel(type: GoalNodeType) {
  switch (type) {
    case "dream":
      return "Dream";
    case "long_term_goal":
      return "Long Term Goal";
    case "milestone":
      return "Milestone";
    case "quest":
      return "Quest";
    case "progress_goal":
      return "Progress Goal";
    case "sequential_milestone":
      return "Sequential Milestone";
    default:
      return "Child";
  }
}

export default function GoalTreeChildTypeModal({ parentTitle, defaultChildType, onChoose, onClose }: GoalTreeChildTypeModalProps) {
  const defaultLabel = formatTypeLabel(defaultChildType);

  return (
    <Modal title="Add Child" onClose={onClose}>
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Parent Goal</p>
          <p className="mt-2 text-lg font-bold text-white">{parentTitle}</p>
          <p className="mt-2 text-sm text-slate-400">Choose what kind of child you want to create under this node.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onChoose(defaultChildType)}
            className={buttonClass + " border-purple-400/50 bg-purple-500/15 text-purple-100 hover:bg-purple-500/25"}
          >
            <span className="block text-xs uppercase tracking-[0.18em] text-purple-200">Default Child</span>
            <span className="mt-1 block text-lg">{defaultLabel}</span>
          </button>

          {defaultChildType !== "quest" ? (
            <button
              type="button"
              onClick={() => onChoose("quest")}
              className={buttonClass + " border-cyan-400/25 bg-cyan-400/10 text-cyan-100 hover:border-cyan-300"}
            >
              <span className="block text-xs uppercase tracking-[0.18em] text-cyan-200">Quest</span>
              <span className="mt-1 block text-lg">Open the shared quest creator</span>
            </button>
          ) : null}
        </div>

        {defaultChildType === "quest" ? (
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-cyan-100">
            This branch creates quests directly, so choosing the default child opens the same quest creation page used in Quests.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4 text-sm text-slate-400">
            Quests will open the shared quest creation page used in the main Quest Manager.
          </div>
        )}
      </div>
    </Modal>
  );
}
