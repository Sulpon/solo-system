"use client";

import { useState } from "react";
import Modal from "../../Modal";
import { EXPERIENCE_TYPES } from "../../../_lib/types/profile-database";
import type { ExperienceEntry, ExperienceType } from "../../../_lib/types/profile-database";

export type ExperienceFormModel = Readonly<{
  id?: string;
  title: string;
  type: ExperienceType;
  organization: string;
  startDate: string;
  endDate: string;
  description: string;
  objective: string;
  responsibilities: string;
  methods: string;
  tools: string;
  results: string;
}>;

type ExperienceFormProps = Readonly<{
  form: ExperienceFormModel;
  isEditing: boolean;
  onCancel: () => void;
  onSave: (form: ExperienceFormModel) => void;
}>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

export function createEmptyExperienceForm(): ExperienceFormModel {
  return {
    title: "",
    type: "Academic Project",
    organization: "",
    startDate: "",
    endDate: "",
    description: "",
    objective: "",
    responsibilities: "",
    methods: "",
    tools: "",
    results: "",
  };
}

export function experienceEntryToForm(entry: ExperienceEntry): ExperienceFormModel {
  return { ...entry };
}

export default function ExperienceForm({ form, isEditing, onCancel, onSave }: ExperienceFormProps) {
  const [model, setModel] = useState<ExperienceFormModel>(form);

  function update<K extends keyof ExperienceFormModel>(key: K, value: ExperienceFormModel[K]) {
    setModel((current) => ({ ...current, [key]: value }));
  }

  function handleSave() {
    if (!model.title.trim()) {
      return;
    }

    onSave({
      ...model,
      title: model.title.trim(),
      organization: model.organization.trim(),
      startDate: model.startDate.trim(),
      endDate: model.endDate.trim(),
      description: model.description.trim(),
      objective: model.objective.trim(),
      responsibilities: model.responsibilities.trim(),
      methods: model.methods.trim(),
      tools: model.tools.trim(),
      results: model.results.trim(),
    });
  }

  return (
    <Modal title={isEditing ? "Edit Experience" : "Add Experience"} onClose={onCancel} wide>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClass}>Title</span>
            <input autoFocus value={model.title} onChange={(event) => update("title", event.target.value)} className={inputClass} placeholder="MSc Thesis Research" />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Type</span>
            <select value={model.type} onChange={(event) => update("type", event.target.value as ExperienceType)} className={inputClass}>
              {EXPERIENCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Organization</span>
            <input value={model.organization} onChange={(event) => update("organization", event.target.value)} className={inputClass} placeholder="University of Padua" />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Tools Used</span>
            <input value={model.tools} onChange={(event) => update("tools", event.target.value)} className={inputClass} placeholder="Python, Scikit-learn" />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Start Date</span>
            <input value={model.startDate} onChange={(event) => update("startDate", event.target.value)} className={inputClass} placeholder="e.g. September 2025" />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>End Date</span>
            <input value={model.endDate} onChange={(event) => update("endDate", event.target.value)} className={inputClass} placeholder="e.g. Present" />
          </label>

          <label className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Description</span>
            <textarea value={model.description} onChange={(event) => update("description", event.target.value)} className={inputClass + " min-h-16"} />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Problem / Objective</span>
            <textarea value={model.objective} onChange={(event) => update("objective", event.target.value)} className={inputClass + " min-h-16"} placeholder="Analysis of complex process datasets using data-driven methods." />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Responsibilities</span>
            <textarea value={model.responsibilities} onChange={(event) => update("responsibilities", event.target.value)} className={inputClass + " min-h-16"} placeholder="Development and evaluation of modelling approaches." />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Methods / Approach</span>
            <textarea value={model.methods} onChange={(event) => update("methods", event.target.value)} className={inputClass + " min-h-16"} placeholder="Multivariate analysis, machine learning, statistical modelling." />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Results / Impact</span>
            <textarea value={model.results} onChange={(event) => update("results", event.target.value)} className={inputClass + " min-h-16"} />
          </label>
        </div>

        <p className="text-xs text-slate-500">Skills Demonstrated is set from the Skills tab - link this experience there via a skill&rsquo;s Related Experience field.</p>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
          Cancel
        </button>
        <button type="button" onClick={handleSave} className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
          Save Experience
        </button>
      </div>
    </Modal>
  );
}
