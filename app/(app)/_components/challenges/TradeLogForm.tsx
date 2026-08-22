"use client";

import { useState } from "react";
import { getLocalDayKey } from "../../_lib/local-day";
import { createTradeLogId } from "../../_lib/types/trade-log";
import type { TradeLogEntry } from "../../_lib/types/trade-log";

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

type TradeLogFormProps = Readonly<{ onLog: (entry: TradeLogEntry) => void }>;

export default function TradeLogForm({ onLog }: TradeLogFormProps) {
  const [date, setDate] = useState(() => getLocalDayKey());
  const [count, setCount] = useState("");

  function handleSubmit() {
    const parsed = Number(count);

    if (!date || !count.trim() || Number.isNaN(parsed) || parsed <= 0) {
      return;
    }

    onLog({ id: createTradeLogId(), date, count: parsed, createdAt: new Date().toISOString() });
    setCount("");
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="space-y-1.5">
        <span className={labelClass}>Date</span>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
      </label>
      <label className="space-y-1.5">
        <span className={labelClass}>Qualifying Trades</span>
        <input type="number" min={0} step="1" value={count} onChange={(event) => setCount(event.target.value)} className={inputClass} placeholder="5" />
      </label>
      <button type="button" onClick={handleSubmit} className="rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/25">
        Log Trades
      </button>
    </div>
  );
}
