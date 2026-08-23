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

function toNumberOrUndefined(value: string) {
  const parsed = Number(value);
  return value.trim() === "" || Number.isNaN(parsed) ? undefined : parsed;
}

const DISPLAY_FIELDS: ReadonlyArray<{ key: keyof BodyweightEntry; label: string; suffix: string }> = [
  { key: "heightCm", label: "Height", suffix: "cm" },
  { key: "bodyFatPercent", label: "Body Fat", suffix: "%" },
  { key: "shoulderWidthCm", label: "Shoulder Width", suffix: "cm" },
  { key: "chestCm", label: "Chest", suffix: "cm" },
  { key: "waistCm", label: "Waist", suffix: "cm" },
  { key: "hipsCm", label: "Hips", suffix: "cm" },
  { key: "armsCm", label: "Upper Arm", suffix: "cm" },
  { key: "forearmCm", label: "Forearm", suffix: "cm" },
  { key: "thighsCm", label: "Thigh", suffix: "cm" },
  { key: "calfCm", label: "Calf", suffix: "cm" },
  { key: "neckCm", label: "Neck", suffix: "cm" },
];

type PhysicalProfileSectionProps = Readonly<{
  latestMeasurement: BodyweightEntry | null;
}>;

export default function PhysicalProfileSection({ latestMeasurement }: PhysicalProfileSectionProps) {
  const { entries, setEntries } = useBodyweight();
  const { addActivityEvents } = useProgression();
  const [showForm, setShowForm] = useState(false);

  const [weight, setWeight] = useState(latestMeasurement ? String(latestMeasurement.weight) : "");
  const [unit, setUnit] = useState<BodyweightUnit>(latestMeasurement?.unit ?? "kg");
  const [heightCm, setHeightCm] = useState(latestMeasurement?.heightCm !== undefined ? String(latestMeasurement.heightCm) : "");
  const [bodyFatPercent, setBodyFatPercent] = useState(latestMeasurement?.bodyFatPercent !== undefined ? String(latestMeasurement.bodyFatPercent) : "");
  const [shoulderWidthCm, setShoulderWidthCm] = useState("");
  const [chestCm, setChestCm] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [hipsCm, setHipsCm] = useState("");
  const [armsCm, setArmsCm] = useState("");
  const [forearmCm, setForearmCm] = useState("");
  const [thighsCm, setThighsCm] = useState("");
  const [calfCm, setCalfCm] = useState("");
  const [neckCm, setNeckCm] = useState("");

  function saveMeasurement() {
    const parsedWeight = Number(weight);
    if (!weight.trim() || Number.isNaN(parsedWeight) || parsedWeight <= 0) {
      return;
    }

    const entry: BodyweightEntry = {
      id: createId(),
      date: getLocalDayKey(),
      weight: parsedWeight,
      unit,
      heightCm: toNumberOrUndefined(heightCm),
      bodyFatPercent: toNumberOrUndefined(bodyFatPercent),
      shoulderWidthCm: toNumberOrUndefined(shoulderWidthCm),
      chestCm: toNumberOrUndefined(chestCm),
      waistCm: toNumberOrUndefined(waistCm),
      hipsCm: toNumberOrUndefined(hipsCm),
      armsCm: toNumberOrUndefined(armsCm),
      forearmCm: toNumberOrUndefined(forearmCm),
      thighsCm: toNumberOrUndefined(thighsCm),
      calfCm: toNumberOrUndefined(calfCm),
      neckCm: toNumberOrUndefined(neckCm),
      createdAt: new Date().toISOString(),
    };

    setEntries((current) => [...current.filter((item) => item.date !== entry.date), entry]);
    addActivityEvents([createBodyweightActivityEvent(entry)]);
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Physical Profile</p>
        {!showForm ? (
          <button type="button" onClick={() => setShowForm(true)} className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
            Update Measurements
          </button>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className={labelClass}>Weight</p>
            <p className="mt-1 text-lg font-bold text-white">{latestMeasurement ? `${latestMeasurement.weight} ${latestMeasurement.unit}` : "—"}</p>
          </div>
          {DISPLAY_FIELDS.map((field) => {
            const value = latestMeasurement?.[field.key];
            return (
              <div key={field.key}>
                <p className={labelClass}>{field.label}</p>
                <p className="mt-1 text-lg font-bold text-white">{value !== undefined ? `${value} ${field.suffix}` : "Not measured"}</p>
              </div>
            );
          })}
        </div>
        {latestMeasurement ? <p className="mt-4 text-xs text-slate-500">As of {latestMeasurement.date}</p> : null}
      </div>

      {showForm ? (
        <div className="rounded-2xl border border-purple-500/25 bg-slate-950/60 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1.5">
              <span className={labelClass}>Weight</span>
              <input type="number" min={0} step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} className={inputClass} placeholder="61" />
            </label>
            <label className="space-y-1.5">
              <span className={labelClass}>Unit</span>
              <select value={unit} onChange={(event) => setUnit(event.target.value as BodyweightUnit)} className={inputClass}>
                <option value="kg">kg</option>
                <option value="lbs">lbs</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className={labelClass}>Height (cm)</span>
              <input type="number" min={0} step="0.1" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} className={inputClass} placeholder="175" />
            </label>
            <label className="space-y-1.5">
              <span className={labelClass}>Body Fat %</span>
              <input type="number" min={0} max={100} step="0.1" value={bodyFatPercent} onChange={(event) => setBodyFatPercent(event.target.value)} className={inputClass} />
            </label>
            <label className="space-y-1.5">
              <span className={labelClass}>Shoulder Width (cm)</span>
              <input type="number" min={0} step="0.1" value={shoulderWidthCm} onChange={(event) => setShoulderWidthCm(event.target.value)} className={inputClass} />
            </label>
            <label className="space-y-1.5">
              <span className={labelClass}>Chest (cm)</span>
              <input type="number" min={0} step="0.1" value={chestCm} onChange={(event) => setChestCm(event.target.value)} className={inputClass} />
            </label>
            <label className="space-y-1.5">
              <span className={labelClass}>Waist (cm)</span>
              <input type="number" min={0} step="0.1" value={waistCm} onChange={(event) => setWaistCm(event.target.value)} className={inputClass} />
            </label>
            <label className="space-y-1.5">
              <span className={labelClass}>Hips (cm)</span>
              <input type="number" min={0} step="0.1" value={hipsCm} onChange={(event) => setHipsCm(event.target.value)} className={inputClass} />
            </label>
            <label className="space-y-1.5">
              <span className={labelClass}>Upper Arm (cm)</span>
              <input type="number" min={0} step="0.1" value={armsCm} onChange={(event) => setArmsCm(event.target.value)} className={inputClass} />
            </label>
            <label className="space-y-1.5">
              <span className={labelClass}>Forearm (cm)</span>
              <input type="number" min={0} step="0.1" value={forearmCm} onChange={(event) => setForearmCm(event.target.value)} className={inputClass} />
            </label>
            <label className="space-y-1.5">
              <span className={labelClass}>Thigh (cm)</span>
              <input type="number" min={0} step="0.1" value={thighsCm} onChange={(event) => setThighsCm(event.target.value)} className={inputClass} />
            </label>
            <label className="space-y-1.5">
              <span className={labelClass}>Calf (cm)</span>
              <input type="number" min={0} step="0.1" value={calfCm} onChange={(event) => setCalfCm(event.target.value)} className={inputClass} />
            </label>
            <label className="space-y-1.5">
              <span className={labelClass}>Neck (cm)</span>
              <input type="number" min={0} step="0.1" value={neckCm} onChange={(event) => setNeckCm(event.target.value)} className={inputClass} />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
              Cancel
            </button>
            <button type="button" onClick={saveMeasurement} className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
              Save
            </button>
          </div>
        </div>
      ) : null}

      <p className="text-xs text-slate-500">
        Entries save to the same measurement history used on the Workouts page. Fields left blank stay unmeasured — nothing is estimated automatically.
      </p>

      {entries.length > 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
          <p className={labelClass}>History</p>
          <div className="mt-3 space-y-2">
            {[...entries]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 10)
              .map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-300">
                  <span>{entry.date}</span>
                  <span className="font-semibold text-white">
                    {entry.weight} {entry.unit}
                    {entry.heightCm !== undefined ? ` · ${entry.heightCm} cm` : ""}
                  </span>
                </div>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
