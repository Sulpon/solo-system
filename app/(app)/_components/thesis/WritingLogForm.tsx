"use client";

import { useState } from "react";
import { getLocalDayKey } from "../../_lib/local-day";
import { createWritingLogId } from "../../_lib/types/writing-log";
import type { WritingLogEntry } from "../../_lib/types/writing-log";

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

type WritingLogFormProps = Readonly<{ onLog: (entry: WritingLogEntry) => void }>;

export default function WritingLogForm({ onLog }: WritingLogFormProps) {
  const [date, setDate] = useState(() => getLocalDayKey());
  const [pages, setPages] = useState("");

  function handleSubmit() {
    const parsed = Number(pages);

    if (!date || !pages.trim() || Number.isNaN(parsed) || parsed <= 0) {
      return;
    }

    onLog({ id: createWritingLogId(), date, pages: parsed, createdAt: new Date().toISOString() });
    setPages("");
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="space-y-1.5">
        <span className={labelClass}>Date</span>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
      </label>
      <label className="space-y-1.5">
        <span className={labelClass}>Pages Written</span>
        <input type="number" min={0} step="1" value={pages} onChange={(event) => setPages(event.target.value)} className={inputClass} placeholder="2" />
      </label>
      <button type="button" onClick={handleSubmit} className="rounded-xl border border-cyan-500/50 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/25">
        Log Pages
      </button>
    </div>
  );
}
