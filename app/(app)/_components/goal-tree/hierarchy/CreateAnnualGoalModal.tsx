"use client";

import { useState } from "react";
import Modal from "../../Modal";
import type { GoalNode } from "../../../_lib/types/goal-tree";

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-[rgb(var(--atlas-accent,168_85_247))]";
const labelClass = "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500";
const NEW_GOAL_VALUE = "__new__";

type CreateAnnualGoalModalProps = Readonly<{
  year: number;
  // Existing undated Dreams. Offering to date one is the non-destructive
  // way to bring pre-Year-level data into the hierarchy - the alternative,
  // auto-dating every old Dream on load, would rewrite the user's data
  // without asking.
  undatedDreams: ReadonlyArray<GoalNode>;
  onCreate: (params: { title: string; description: string }) => void;
  onAdoptDream: (dreamId: string) => void;
  onClose: () => void;
}>;

export default function CreateAnnualGoalModal({ year, undatedDreams, onCreate, onAdoptDream, onClose }: CreateAnnualGoalModalProps) {
  const [source, setSource] = useState<string>(NEW_GOAL_VALUE);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const creatingNew = source === NEW_GOAL_VALUE;
  const canSave = creatingNew ? title.trim().length > 0 : Boolean(source);

  function handleSave() {
    if (!canSave) return;

    if (creatingNew) {
      onCreate({ title: title.trim(), description: description.trim() });
      return;
    }

    onAdoptDream(source);
  }

  return (
    <Modal title={`New Annual Goal · ${year}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-400">
          An Annual Goal is your direction for <span className="font-semibold text-white">{year}</span>. Quarterly goals hang beneath it.
        </p>

        {undatedDreams.length > 0 ? (
          <label className="block space-y-1.5">
            <span className={labelClass}>Source</span>
            <select value={source} onChange={(event) => setSource(event.target.value)} className={inputClass}>
              <option value={NEW_GOAL_VALUE}>+ Write a new Annual Goal</option>
              {undatedDreams.map((dream) => (
                <option key={dream.id} value={dream.id}>
                  Use existing dream: {dream.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {creatingNew ? (
          <>
            <label className="block space-y-1.5">
              <span className={labelClass}>Annual Goal</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Build the foundation for freedom" className={inputClass} autoFocus />
            </label>

            <label className="block space-y-1.5">
              <span className={labelClass}>Vision (optional)</span>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className={inputClass} />
            </label>
          </>
        ) : (
          <p className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-400">
            This keeps the dream and everything under it exactly as it is, and dates it to {year} so it appears in this hierarchy.
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-xl border border-[rgb(var(--atlas-accent,168_85_247)/0.5)] bg-[rgb(var(--atlas-accent,168_85_247)/0.15)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[rgb(var(--atlas-accent,168_85_247)/0.25)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creatingNew ? "Create" : "Use this dream"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
