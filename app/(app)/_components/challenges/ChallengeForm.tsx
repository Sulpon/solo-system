"use client";

import { useState } from "react";
import { getLocalDayKey, parseLocalDayKey } from "../../_lib/local-day";
import type { ChallengeDraft } from "../../_lib/hooks/useChallenges";
import type { ChallengeMetricDraft } from "../../_lib/hooks/useChallengeMetrics";
import type { ChallengeMetricType } from "../../_lib/types/challenge";

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

const METRIC_TYPES: ReadonlyArray<{ value: ChallengeMetricType; label: string }> = [
  { value: "boolean", label: "Boolean (yes/no)" },
  { value: "number", label: "Number" },
  { value: "rating", label: "Rating (0-10)" },
  { value: "text", label: "Text" },
  { value: "photo", label: "Photo" },
];

type MetricRowDraft = Readonly<{
  key: string;
  name: string;
  type: ChallengeMetricType;
  target: string;
  unit: string;
  required: boolean;
}>;

function createMetricRow(): MetricRowDraft {
  return { key: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: "", type: "boolean", target: "", unit: "", required: true };
}

function addDaysToDayKey(dayKey: string, days: number): string {
  const date = parseLocalDayKey(dayKey);
  date.setDate(date.getDate() + days);
  return getLocalDayKey(date);
}

type ChallengeFormProps = Readonly<{
  onSave: (challengeDraft: ChallengeDraft, metricDrafts: ReadonlyArray<Omit<ChallengeMetricDraft, "challengeId">>, startNow: boolean) => void;
  onCancel: () => void;
}>;

export default function ChallengeForm({ onSave, onCancel }: ChallengeFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🎯");
  const [category, setCategory] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [startDate, setStartDate] = useState(getLocalDayKey());
  const [durationDays, setDurationDays] = useState("21");
  const [metricRows, setMetricRows] = useState<MetricRowDraft[]>([createMetricRow()]);

  const parsedDuration = Math.max(1, Math.min(365, Number(durationDays) || 0));
  const computedEndDate = durationDays.trim() !== "" && parsedDuration > 0 ? addDaysToDayKey(startDate, parsedDuration - 1) : null;

  const validMetricRows = metricRows.filter((row) => row.name.trim() !== "");
  const canSave = title.trim() !== "" && validMetricRows.length > 0 && parsedDuration > 0;

  function updateRow(key: string, patch: Partial<MetricRowDraft>) {
    setMetricRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function removeRow(key: string) {
    setMetricRows((current) => (current.length > 1 ? current.filter((row) => row.key !== key) : current));
  }

  function buildDrafts() {
    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const challengeDraft: ChallengeDraft = {
      title: title.trim(),
      description: description.trim() || undefined,
      icon: icon.trim() || "🎯",
      category: category.trim() || "General",
      tags: tags.length > 0 ? tags : undefined,
      startDate,
      durationDays: parsedDuration,
    };

    const metricDrafts = validMetricRows.map((row) => ({
      name: row.name.trim(),
      type: row.type,
      target: row.target.trim() === "" ? undefined : Number(row.target),
      unit: row.unit.trim() || undefined,
      required: row.required,
    }));

    return { challengeDraft, metricDrafts };
  }

  function handleSave(startNow: boolean) {
    if (!canSave) return;
    const { challengeDraft, metricDrafts } = buildDrafts();
    onSave(challengeDraft, metricDrafts, startNow);
  }

  return (
    <div className="space-y-5 rounded-2xl border border-purple-500/25 bg-slate-950/60 p-5">
      <div className="grid gap-3 sm:grid-cols-[80px_1fr]">
        <label className="space-y-1.5">
          <span className={labelClass}>Icon</span>
          <input type="text" value={icon} onChange={(event) => setIcon(event.target.value)} className={inputClass + " text-center text-xl"} maxLength={4} />
        </label>
        <label className="space-y-1.5">
          <span className={labelClass}>Name</span>
          <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} placeholder="21 Days - Healthy Skin" autoFocus />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className={labelClass}>Description</span>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className={inputClass} placeholder="Build a consistent skincare routine and observe changes in skin condition." />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className={labelClass}>Category</span>
          <input type="text" value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass} placeholder="Health" />
        </label>
        <label className="space-y-1.5">
          <span className={labelClass}>Tags (comma separated)</span>
          <input type="text" value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} className={inputClass} placeholder="Skincare, Habits, Self-development" />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1.5">
          <span className={labelClass}>Start Date</span>
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={inputClass} />
        </label>
        <label className="space-y-1.5">
          <span className={labelClass}>Duration (days)</span>
          <input type="number" min={1} max={365} value={durationDays} onChange={(event) => setDurationDays(event.target.value)} className={inputClass} />
        </label>
        <div className="space-y-1.5">
          <span className={labelClass}>End Date</span>
          <div className="flex h-[38px] items-center rounded-xl border border-slate-800 bg-slate-950/40 px-3 text-sm text-slate-400">{computedEndDate ?? "—"}</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={labelClass}>Daily Metrics</span>
          <button type="button" onClick={() => setMetricRows((current) => [...current, createMetricRow()])} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-purple-400/60 hover:text-white">
            + Add Metric
          </button>
        </div>

        <div className="space-y-2">
          {metricRows.map((row) => (
            <div key={row.key} className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3 sm:grid-cols-[1.4fr_1fr_0.7fr_0.7fr_auto_auto]">
              <input type="text" value={row.name} onChange={(event) => updateRow(row.key, { name: event.target.value })} className={inputClass} placeholder="Metric name (e.g. Morning wash)" />
              <select value={row.type} onChange={(event) => updateRow(row.key, { type: event.target.value as ChallengeMetricType })} className={inputClass}>
                {METRIC_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {row.type === "number" || row.type === "rating" ? (
                <input type="number" value={row.target} onChange={(event) => updateRow(row.key, { target: event.target.value })} className={inputClass} placeholder="Target" />
              ) : (
                <div />
              )}
              {row.type === "number" ? (
                <input type="text" value={row.unit} onChange={(event) => updateRow(row.key, { unit: event.target.value })} className={inputClass} placeholder="Unit" />
              ) : (
                <div />
              )}
              <label className="flex items-center gap-2 whitespace-nowrap text-xs text-slate-400">
                <input type="checkbox" checked={row.required} onChange={(event) => updateRow(row.key, { required: event.target.checked })} className="accent-purple-500" />
                Required
              </label>
              <button type="button" onClick={() => removeRow(row.key)} className="text-xs text-rose-300 hover:text-rose-200">
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={!canSave}
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save as Draft
        </button>
        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={!canSave}
          className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Start Challenge
        </button>
      </div>
    </div>
  );
}
