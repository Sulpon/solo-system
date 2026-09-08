"use client";

import { useState } from "react";
import Modal from "../Modal";
import KeyResultsEditor from "./KeyResultsEditor";
import { formatDateRange, type QuarterRange } from "../../_lib/engines/planning-engine";
import type { GoalNode, KeyResult } from "../../_lib/types/goal-tree";

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500";
const NEW_DREAM_VALUE = "__new__";

type CreateQuarterlyGoalModalProps = Readonly<{
  quarter: QuarterRange;
  dreams: ReadonlyArray<GoalNode>;
  onCreate: (params: { dreamId?: string; newDreamTitle?: string; title: string; description: string; keyResults: ReadonlyArray<KeyResult> }) => void;
  onClose: () => void;
}>;

export default function CreateQuarterlyGoalModal({ quarter, dreams, onCreate, onClose }: CreateQuarterlyGoalModalProps) {
  const [dreamId, setDreamId] = useState<string>(dreams[0]?.id ?? NEW_DREAM_VALUE);
  const [newDreamTitle, setNewDreamTitle] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keyResults, setKeyResults] = useState<ReadonlyArray<KeyResult>>([]);

  const usingNewDream = dreamId === NEW_DREAM_VALUE;
  const canSave = title.trim().length > 0 && (usingNewDream ? newDreamTitle.trim().length > 0 : Boolean(dreamId));

  function handleSave() {
    if (!canSave) return;
    onCreate({
      dreamId: usingNewDream ? undefined : dreamId,
      newDreamTitle: usingNewDream ? newDreamTitle.trim() : undefined,
      title: title.trim(),
      description: description.trim(),
      keyResults,
    });
  }

  return (
    <Modal title="New Quarterly Goal" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-400">
          For <span className="font-semibold text-white">{quarter.label}</span> · {formatDateRange(quarter.start, quarter.end)}
        </div>

        <label className="block space-y-1.5">
          <span className={labelClass}>Dream</span>
          <select value={dreamId} onChange={(event) => setDreamId(event.target.value)} className={inputClass}>
            {dreams.map((dream) => (
              <option key={dream.id} value={dream.id}>
                {dream.title}
              </option>
            ))}
            <option value={NEW_DREAM_VALUE}>+ Create New Dream</option>
          </select>
        </label>

        {usingNewDream ? (
          <label className="block space-y-1.5">
            <span className={labelClass}>New Dream Title</span>
            <input value={newDreamTitle} onChange={(event) => setNewDreamTitle(event.target.value)} placeholder="Build a successful engineering career" className={inputClass} autoFocus />
          </label>
        ) : null}

        <label className="block space-y-1.5">
          <span className={labelClass}>Quarterly Goal</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Enter the European engineering job market" className={inputClass} autoFocus={!usingNewDream} />
        </label>

        <label className="block space-y-1.5">
          <span className={labelClass}>Description (optional)</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className={inputClass} />
        </label>

        <div className="space-y-2">
          <span className={labelClass}>Key Results (optional)</span>
          <KeyResultsEditor keyResults={keyResults} onChange={setKeyResults} />
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </div>
    </Modal>
  );
}
