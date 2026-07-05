"use client";

import Modal from "../Modal";
import type { GoalNode } from "../../_lib/types/goal-tree";

type QuestCompletionModalProps = Readonly<{
  questTitle: string;
  goal: GoalNode | null;
  progressValue: string;
  onChange: (nextValue: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

export default function QuestCompletionModal({ questTitle, goal, progressValue, onChange, onCancel, onConfirm }: QuestCompletionModalProps) {
  const unitLabel = goal?.unit?.trim() || "value";
  const currentValue = Math.max(0, Number(goal?.currentValue ?? 0));
  const targetValue = Math.max(1, Number(goal?.targetValue ?? 1));

  return (
    <Modal title="Quest Complete" onClose={onCancel}>
      <div className="space-y-5">
        <div className="rounded-xl border border-slate-800 bg-slate-950/55 px-4 py-3">
          <p className={labelClass}>Quest</p>
          <p className="mt-1 text-lg font-bold text-white">{questTitle}</p>
        </div>

        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Linked Progress Goal</p>
          {goal ? (
            <>
              <h3 className="mt-2 text-lg font-bold text-white">{goal.title}</h3>
              <p className="mt-1 text-sm text-slate-400">
                {currentValue.toLocaleString()} / {targetValue.toLocaleString()} {unitLabel}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">The linked goal was removed. You can still complete the quest.</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="space-y-2">
            <span className={labelClass}>How much progress did you make?</span>
            <input
              type="number"
              min={0}
              value={progressValue}
              onChange={(event) => onChange(event.target.value)}
              className={inputClass}
              placeholder="+1"
              autoFocus
            />
          </label>
          <div className="rounded-xl border border-slate-800 bg-slate-950/55 px-4 py-3 text-sm text-slate-400">
            <p className={labelClass}>Unit</p>
            <p className="mt-1 text-base text-white">{unitLabel}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
          >
            Confirm
          </button>
        </div>
      </div>
    </Modal>
  );
}
