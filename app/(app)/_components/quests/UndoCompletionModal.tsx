"use client";

import Modal from "../Modal";

type UndoCompletionModalProps = Readonly<{
  questTitle: string;
  metricValue: number | null;
  unit: string | null;
  goalTitle: string | null;
  goalBefore: number | null;
  goalAfter: number | null;
  hasChallenge: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}>;

const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

export default function UndoCompletionModal({ questTitle, metricValue, unit, goalTitle, goalBefore, goalAfter, hasChallenge, onCancel, onConfirm }: UndoCompletionModalProps) {
  return (
    <Modal title="Remove Completion?" onClose={onCancel}>
      <div className="space-y-5">
        <div className="rounded-xl border border-slate-800 bg-slate-950/55 px-4 py-3">
          <p className={labelClass}>Quest</p>
          <p className="mt-1 text-lg font-bold text-white">{questTitle}</p>
        </div>

        <p className="text-sm text-slate-400">This will also remove the progress recorded from this completion.</p>

        <div className="space-y-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
          {metricValue !== null ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Recorded metric</span>
              <span className="font-semibold text-white">
                {metricValue.toLocaleString()}
                {unit ? ` ${unit}` : ""}
              </span>
            </div>
          ) : null}

          {goalTitle && goalBefore !== null && goalAfter !== null ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">{goalTitle}</span>
              <span className="font-semibold text-white">
                {goalBefore.toLocaleString()} → {goalAfter.toLocaleString()}
              </span>
            </div>
          ) : null}

          {hasChallenge ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Challenge progress</span>
              <span className="font-semibold text-white">Will be recalculated</span>
            </div>
          ) : null}

          {metricValue === null && !goalTitle && !hasChallenge ? <p className="text-sm text-slate-500">No additional progress was recorded by this completion.</p> : null}
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/25"
          >
            Remove Completion
          </button>
        </div>
      </div>
    </Modal>
  );
}
