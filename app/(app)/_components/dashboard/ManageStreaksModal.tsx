"use client";

import { useState } from "react";
import Modal from "../Modal";
import type { StreakCandidate } from "../../_lib/engines/dashboard-personalization-engine";
import type { ManualStreakDraft } from "../../_lib/hooks/useManualStreaks";

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500";

type ManageStreaksModalProps = Readonly<{
  candidates: ReadonlyArray<StreakCandidate>;
  selectedIds: ReadonlyArray<string>;
  onSave: (ids: ReadonlyArray<string>) => void;
  onAddManualStreak: (draft: ManualStreakDraft) => void;
  onIncrementManualStreak: (id: string, by?: number) => void;
  onDeleteManualStreak: (id: string) => void;
  onClose: () => void;
}>;

// "Remove from Dashboard" here is unchecking a box - it only ever changes
// selectedStreakIds (a Dashboard preference). The one destructive action
// (Delete, for a manual streak the user created) is separate and explicit,
// per the spec's "Remove from Dashboard is NOT Delete streak."
export default function ManageStreaksModal({ candidates, selectedIds, onSave, onAddManualStreak, onIncrementManualStreak, onDeleteManualStreak, onClose }: ManageStreaksModalProps) {
  const [checked, setChecked] = useState(new Set(selectedIds));
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualStreakValue, setManualStreakValue] = useState("1");

  function toggle(id: string) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAddManual() {
    if (!manualTitle.trim()) return;
    onAddManualStreak({ title: manualTitle.trim(), currentStreak: Math.max(0, Math.floor(Number(manualStreakValue) || 0)) });
    setManualTitle("");
    setManualStreakValue("1");
    setShowManualForm(false);
  }

  return (
    <Modal title="Manage Streaks" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className={labelClass}>Streaks</p>
          <div className="mt-2 space-y-1.5">
            {candidates.length === 0 ? (
              <p className="text-sm text-slate-500">No active streaks yet - complete a recurring Quest a few days in a row, or add one manually below.</p>
            ) : (
              candidates.map((candidate) => (
                <div key={candidate.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/45 px-3 py-2">
                  <label className="flex min-w-0 flex-1 items-center gap-2.5">
                    <input type="checkbox" checked={checked.has(candidate.id)} onChange={() => toggle(candidate.id)} className="accent-orange-500" />
                    <span className="min-w-0 truncate text-sm text-slate-200">{candidate.title}</span>
                    {candidate.source === "manual" ? <span className="shrink-0 text-[10px] uppercase tracking-[0.08em] text-slate-600">Manual</span> : null}
                  </label>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-bold text-orange-300">🔥 {candidate.currentStreak}d</span>
                    {candidate.source === "manual" ? (
                      <>
                        <button type="button" onClick={() => onIncrementManualStreak(candidate.sourceId, 1)} title="+1 day" className="rounded-md border border-slate-700 px-1.5 py-0.5 text-xs text-slate-400 transition hover:border-orange-400/60 hover:text-white">
                          +1
                        </button>
                        <button type="button" onClick={() => onDeleteManualStreak(candidate.sourceId)} title="Delete this manual streak" className="text-xs text-slate-600 transition hover:text-rose-300">
                          Delete
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {showManualForm ? (
          <div className="space-y-3 rounded-xl border border-orange-400/20 bg-orange-400/5 p-4">
            <label className="block space-y-1.5">
              <span className={labelClass}>Title</span>
              <input value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} placeholder="Cold showers" autoFocus className={inputClass} />
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Current Streak (days)</span>
              <input type="number" min={0} value={manualStreakValue} onChange={(event) => setManualStreakValue(event.target.value)} className={inputClass} />
            </label>
            <p className="text-xs text-slate-500">This is a starting value you set yourself - Atlas can&apos;t verify a manual streak, only your real Quest streaks above are automatically tracked.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowManualForm(false)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:text-white">
                Cancel
              </button>
              <button type="button" onClick={handleAddManual} disabled={!manualTitle.trim()} className="rounded-lg border border-orange-400/50 bg-orange-500/15 px-3 py-1.5 text-xs font-semibold text-orange-100 transition hover:bg-orange-500/25 disabled:cursor-not-allowed disabled:opacity-40">
                Create Manual Streak
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowManualForm(true)} className="w-full rounded-xl border border-dashed border-slate-700 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:border-orange-400/50 hover:text-white">
            + Create Manual Streak
          </button>
        )}

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
            className="rounded-xl border border-orange-400/50 bg-orange-500/15 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:bg-orange-500/25"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
