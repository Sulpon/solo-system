"use client";

import { useState } from "react";
import Modal from "../Modal";
import type { MonthRef } from "../../_lib/engines/planning-engine";

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500";

type CreateMonthlyMilestoneModalProps = Readonly<{
  months: ReadonlyArray<MonthRef>;
  defaultMonthIndex?: number;
  onCreate: (params: { title: string; description: string; month: MonthRef }) => void;
  onClose: () => void;
}>;

export default function CreateMonthlyMilestoneModal({ months, defaultMonthIndex = 0, onCreate, onClose }: CreateMonthlyMilestoneModalProps) {
  const [monthIndex, setMonthIndex] = useState(defaultMonthIndex);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  function handleSave() {
    if (!title.trim()) return;
    onCreate({ title: title.trim(), description: description.trim(), month: months[monthIndex] });
  }

  return (
    <Modal title="New Monthly Milestone" onClose={onClose}>
      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className={labelClass}>Month</span>
          <select value={monthIndex} onChange={(event) => setMonthIndex(Number(event.target.value))} className={inputClass}>
            {months.map((month, index) => (
              <option key={month.label} value={index}>
                {month.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className={labelClass}>Milestone</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Prepare CV and submit first 10 applications" className={inputClass} autoFocus />
        </label>

        <label className="block space-y-1.5">
          <span className={labelClass}>Description (optional)</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className={inputClass} />
        </label>

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
