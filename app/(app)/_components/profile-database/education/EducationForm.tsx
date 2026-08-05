"use client";

import { useState } from "react";
import Modal from "../../Modal";
import type { EducationEntry } from "../../../_lib/types/profile-database";

export type EducationFormModel = Readonly<{
  id?: string;
  degree: string;
  institution: string;
  location: string;
  fieldOfStudy: string;
  specialization: string;
  startDate: string;
  endDate: string;
  status: string;
}>;

type EducationFormProps = Readonly<{
  form: EducationFormModel;
  isEditing: boolean;
  onCancel: () => void;
  onSave: (form: EducationFormModel) => void;
}>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

export function createEmptyEducationForm(): EducationFormModel {
  return { degree: "", institution: "", location: "", fieldOfStudy: "", specialization: "", startDate: "", endDate: "", status: "" };
}

export function educationEntryToForm(entry: EducationEntry): EducationFormModel {
  return { ...entry };
}

export default function EducationForm({ form, isEditing, onCancel, onSave }: EducationFormProps) {
  const [model, setModel] = useState<EducationFormModel>(form);

  function update<K extends keyof EducationFormModel>(key: K, value: EducationFormModel[K]) {
    setModel((current) => ({ ...current, [key]: value }));
  }

  function handleSave() {
    if (!model.degree.trim() || !model.institution.trim()) {
      return;
    }

    onSave({
      ...model,
      degree: model.degree.trim(),
      institution: model.institution.trim(),
      location: model.location.trim(),
      fieldOfStudy: model.fieldOfStudy.trim(),
      specialization: model.specialization.trim(),
      startDate: model.startDate.trim(),
      endDate: model.endDate.trim(),
      status: model.status.trim(),
    });
  }

  return (
    <Modal title={isEditing ? "Edit Education" : "Add Education"} onClose={onCancel}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClass}>Degree</span>
            <input autoFocus value={model.degree} onChange={(event) => update("degree", event.target.value)} className={inputClass} placeholder="MSc Chemical and Process Engineering" />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Institution</span>
            <input value={model.institution} onChange={(event) => update("institution", event.target.value)} className={inputClass} placeholder="University of Padua" />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Location</span>
            <input value={model.location} onChange={(event) => update("location", event.target.value)} className={inputClass} placeholder="Padua, Italy" />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Field of Study</span>
            <input value={model.fieldOfStudy} onChange={(event) => update("fieldOfStudy", event.target.value)} className={inputClass} placeholder="Chemical Engineering" />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Specialization</span>
            <input value={model.specialization} onChange={(event) => update("specialization", event.target.value)} className={inputClass} placeholder="Data-driven process analysis, machine learning..." />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Start Date</span>
            <input value={model.startDate} onChange={(event) => update("startDate", event.target.value)} className={inputClass} placeholder="e.g. September 2024" />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>End Date</span>
            <input value={model.endDate} onChange={(event) => update("endDate", event.target.value)} className={inputClass} placeholder="e.g. November 2026 (or expected)" />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Status</span>
            <input value={model.status} onChange={(event) => update("status", event.target.value)} className={inputClass} placeholder="e.g. Current student, Completed" list="education-status-options" />
            <datalist id="education-status-options">
              <option value="Current student" />
              <option value="Completed" />
              <option value="Planned" />
            </datalist>
          </label>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
          Cancel
        </button>
        <button type="button" onClick={handleSave} className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
          Save Education
        </button>
      </div>
    </Modal>
  );
}
