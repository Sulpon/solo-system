"use client";

import { useState } from "react";
import Modal from "../../Modal";

type AddCoverLetterModalProps = Readonly<{
  onCancel: () => void;
  onCreate: (fields: { company: string; position: string }) => void;
}>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

export default function AddCoverLetterModal({ onCancel, onCreate }: AddCoverLetterModalProps) {
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");

  function handleCreate() {
    if (!company.trim()) {
      return;
    }

    onCreate({ company: company.trim(), position: position.trim() });
  }

  return (
    <Modal title="Add Cover Letter" onClose={onCancel}>
      <div className="space-y-4">
        <label className="space-y-2 block">
          <span className={labelClass}>Company</span>
          <input autoFocus value={company} onChange={(event) => setCompany(event.target.value)} className={inputClass} placeholder="DSM-Firmenich" />
        </label>
        <label className="space-y-2 block">
          <span className={labelClass}>Position</span>
          <input value={position} onChange={(event) => setPosition(event.target.value)} className={inputClass} placeholder="Process Engineer" />
        </label>
        <p className="text-xs text-slate-500">Date, version, and notes can be filled in on the cover letter&apos;s own page.</p>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!company.trim()}
          className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Create Cover Letter
        </button>
      </div>
    </Modal>
  );
}
