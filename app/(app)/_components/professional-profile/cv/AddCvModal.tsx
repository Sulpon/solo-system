"use client";

import { useState } from "react";
import Modal from "../../Modal";

type AddCvModalProps = Readonly<{
  onCancel: () => void;
  onCreate: (fields: { name: string; targetMarket: string }) => void;
}>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

export default function AddCvModal({ onCancel, onCreate }: AddCvModalProps) {
  const [name, setName] = useState("");
  const [targetMarket, setTargetMarket] = useState("");

  function handleCreate() {
    if (!name.trim()) {
      return;
    }

    onCreate({ name: name.trim(), targetMarket: targetMarket.trim() });
  }

  return (
    <Modal title="Add CV" onClose={onCancel}>
      <div className="space-y-4">
        <label className="space-y-2 block">
          <span className={labelClass}>CV Name</span>
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="Netherlands" />
        </label>
        <label className="space-y-2 block">
          <span className={labelClass}>Target Market</span>
          <input value={targetMarket} onChange={(event) => setTargetMarket(event.target.value)} className={inputClass} placeholder="Netherlands, graduate roles" />
        </label>
        <p className="text-xs text-slate-500">Target roles, notes, and which Education/Experience/Skills it leads with can all be filled in on the CV&apos;s own page.</p>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!name.trim()}
          className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Create CV
        </button>
      </div>
    </Modal>
  );
}
