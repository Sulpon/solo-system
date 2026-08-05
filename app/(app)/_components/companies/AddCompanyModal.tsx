"use client";

import { useState } from "react";
import Modal from "../Modal";

type AddCompanyModalProps = Readonly<{
  onCancel: () => void;
  onCreate: (fields: { name: string; country: string; industry: string }) => void;
}>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

export default function AddCompanyModal({ onCancel, onCreate }: AddCompanyModalProps) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("");

  function handleCreate() {
    if (!name.trim()) {
      return;
    }

    onCreate({ name: name.trim(), country: country.trim(), industry: industry.trim() });
  }

  return (
    <Modal title="Add Company" onClose={onCancel}>
      <div className="space-y-4">
        <label className="space-y-2 block">
          <span className={labelClass}>Company Name</span>
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="DSM-Firmenich" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClass}>Country</span>
            <input value={country} onChange={(event) => setCountry(event.target.value)} className={inputClass} placeholder="Netherlands" />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Industry</span>
            <input value={industry} onChange={(event) => setIndustry(event.target.value)} className={inputClass} placeholder="Chemical / Biotechnology" />
          </label>
        </div>
        <p className="text-xs text-slate-500">Everything else - website, career opportunities, notes - can be filled in on the company&apos;s own page after it&apos;s created.</p>
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
          Create Company
        </button>
      </div>
    </Modal>
  );
}
