"use client";

import { useState } from "react";
import Modal from "../Modal";
import { defaultWeekRange } from "../../_lib/engines/planning-engine";
import { parseLocalDayKey } from "../../_lib/local-day";

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500";

type CreateWeeklyMilestoneModalProps = Readonly<{
  defaultStart?: string;
  onCreate: (params: { title: string; description: string; targetValue: number; unit: string; periodStart: string; periodEnd: string }) => void;
  onClose: () => void;
}>;

export default function CreateWeeklyMilestoneModal({ defaultStart, onCreate, onClose }: CreateWeeklyMilestoneModalProps) {
  const defaults = defaultWeekRange(defaultStart ? parseLocalDayKey(defaultStart) : undefined);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState("1");
  const [unit, setUnit] = useState("");
  const [periodStart, setPeriodStart] = useState(defaultStart ?? defaults.start);
  const [periodEnd, setPeriodEnd] = useState(defaults.end);

  function handleSave() {
    if (!title.trim()) return;
    const target = Math.max(1, Number(targetValue) || 1);
    onCreate({ title: title.trim(), description: description.trim(), targetValue: target, unit: unit.trim(), periodStart, periodEnd });
  }

  return (
    <Modal title="New Weekly Milestone" onClose={onClose}>
      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className={labelClass}>Milestone</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Finalize CV and identify 5 suitable companies" className={inputClass} autoFocus />
        </label>

        <label className="block space-y-1.5">
          <span className={labelClass}>Description (optional)</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className={inputClass} />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className={labelClass}>Target</span>
            <input type="number" min={1} value={targetValue} onChange={(event) => setTargetValue(event.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1.5">
            <span className={labelClass}>Unit (optional)</span>
            <input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="applications, sections, quests..." className={inputClass} />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className={labelClass}>Week Start</span>
            <input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1.5">
            <span className={labelClass}>Week End</span>
            <input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} className={inputClass} />
          </label>
        </div>

        <p className="text-[11px] text-slate-500">
          Tip: for a fuzzy goal, set the target to how many concrete quests you plan to attach (e.g. 3), and unit to &quot;quests&quot; - each completed quest counts toward it.
        </p>

        <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim()}
            className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </div>
    </Modal>
  );
}
