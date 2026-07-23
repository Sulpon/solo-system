"use client";

import { useState } from "react";
import { useBodyweight } from "../../_lib/hooks/useBodyweight";
import { useProgression } from "../../_lib/hooks/useProgression";
import { createBodyweightActivityEvent } from "../../_lib/activity-events";
import { getLocalDayKey } from "../../_lib/local-day";
import type { BodyweightEntry, BodyweightUnit } from "../../_lib/types/bodyweight";

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

function createId() {
  return `bw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function BodyweightPanel() {
  const { entries, setEntries } = useBodyweight();
  const { addActivityEvents } = useProgression();
  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState<BodyweightUnit>("kg");
  const [bodyFatPercent, setBodyFatPercent] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [chestCm, setChestCm] = useState("");
  const [armsCm, setArmsCm] = useState("");
  const [thighsCm, setThighsCm] = useState("");

  const sortedEntries = [...entries].sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime());
  const latest = sortedEntries[0];

  function toNumberOrUndefined(value: string) {
    const parsed = Number(value);
    return value.trim() === "" || Number.isNaN(parsed) ? undefined : parsed;
  }

  function logEntry() {
    const parsedWeight = Number(weight);

    if (!weight.trim() || Number.isNaN(parsedWeight) || parsedWeight <= 0) {
      return;
    }

    const entry: BodyweightEntry = {
      id: createId(),
      date: getLocalDayKey(),
      weight: parsedWeight,
      unit,
      bodyFatPercent: toNumberOrUndefined(bodyFatPercent),
      waistCm: toNumberOrUndefined(waistCm),
      chestCm: toNumberOrUndefined(chestCm),
      armsCm: toNumberOrUndefined(armsCm),
      thighsCm: toNumberOrUndefined(thighsCm),
      createdAt: new Date().toISOString(),
    };

    setEntries((current) => [...current.filter((item) => item.date !== entry.date), entry]);
    addActivityEvents([createBodyweightActivityEvent(entry)]);
    setWeight("");
    setBodyFatPercent("");
    setWaistCm("");
    setChestCm("");
    setArmsCm("");
    setThighsCm("");
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Log Bodyweight</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="space-y-1.5">
            <span className={labelClass}>Weight</span>
            <input type="number" min={0} step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} className={inputClass} placeholder="75" />
          </label>
          <label className="space-y-1.5">
            <span className={labelClass}>Unit</span>
            <select value={unit} onChange={(event) => setUnit(event.target.value as BodyweightUnit)} className={inputClass}>
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className={labelClass}>Body Fat % (optional)</span>
            <input type="number" min={0} max={100} step="0.1" value={bodyFatPercent} onChange={(event) => setBodyFatPercent(event.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1.5">
            <span className={labelClass}>Waist (cm, optional)</span>
            <input type="number" min={0} step="0.1" value={waistCm} onChange={(event) => setWaistCm(event.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1.5">
            <span className={labelClass}>Chest (cm, optional)</span>
            <input type="number" min={0} step="0.1" value={chestCm} onChange={(event) => setChestCm(event.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1.5">
            <span className={labelClass}>Arms (cm, optional)</span>
            <input type="number" min={0} step="0.1" value={armsCm} onChange={(event) => setArmsCm(event.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1.5">
            <span className={labelClass}>Thighs (cm, optional)</span>
            <input type="number" min={0} step="0.1" value={thighsCm} onChange={(event) => setThighsCm(event.target.value)} className={inputClass} />
          </label>
        </div>
        <button type="button" onClick={logEntry} className="mt-4 rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
          Log Entry
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">History</p>
        {latest ? <p className="mt-2 text-sm text-slate-400">Latest: {latest.weight} {latest.unit} on {latest.date}</p> : null}
        <div className="mt-4 space-y-2">
          {sortedEntries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/45 p-4 text-center text-sm text-slate-400">No bodyweight entries yet.</div>
          ) : (
            sortedEntries.slice(0, 20).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-300">
                <span>{entry.date}</span>
                <span className="font-semibold text-white">
                  {entry.weight} {entry.unit}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
