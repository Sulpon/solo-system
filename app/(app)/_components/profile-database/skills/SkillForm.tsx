"use client";

import { useState } from "react";
import Modal from "../../Modal";
import ProfileReferencePicker from "../../professional-profile/ProfileReferencePicker";
import { SKILL_CATEGORY_SUGGESTIONS, SKILL_LEVELS } from "../../../_lib/types/profile-database";
import type { ExperienceEntry, SkillEntry, SkillLevel } from "../../../_lib/types/profile-database";

export type SkillFormModel = Readonly<{
  id?: string;
  name: string;
  category: string;
  level: SkillLevel;
  description: string;
  evidence: string;
  relatedExperienceIds: string[];
}>;

type SkillFormProps = Readonly<{
  form: SkillFormModel;
  isEditing: boolean;
  experienceEntries: ReadonlyArray<ExperienceEntry>;
  onCancel: () => void;
  onSave: (form: SkillFormModel) => void;
}>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

const SKILL_CATEGORY_DATALIST_ID = "skill-category-options";

export function createEmptySkillForm(): SkillFormModel {
  return { name: "", category: "", level: "Intermediate", description: "", evidence: "", relatedExperienceIds: [] };
}

export function skillEntryToForm(entry: SkillEntry): SkillFormModel {
  return { ...entry, relatedExperienceIds: [...entry.relatedExperienceIds] };
}

export default function SkillForm({ form, isEditing, experienceEntries, onCancel, onSave }: SkillFormProps) {
  const [model, setModel] = useState<SkillFormModel>(form);

  function update<K extends keyof SkillFormModel>(key: K, value: SkillFormModel[K]) {
    setModel((current) => ({ ...current, [key]: value }));
  }

  function handleSave() {
    if (!model.name.trim()) {
      return;
    }

    onSave({
      ...model,
      name: model.name.trim(),
      category: model.category.trim(),
      description: model.description.trim(),
      evidence: model.evidence.trim(),
    });
  }

  return (
    <Modal title={isEditing ? "Edit Skill" : "Add Skill"} onClose={onCancel}>
      <datalist id={SKILL_CATEGORY_DATALIST_ID}>
        {SKILL_CATEGORY_SUGGESTIONS.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClass}>Skill Name</span>
            <input autoFocus value={model.name} onChange={(event) => update("name", event.target.value)} className={inputClass} placeholder="Python" />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Category</span>
            <input value={model.category} onChange={(event) => update("category", event.target.value)} className={inputClass} placeholder="Data Science & Machine Learning" list={SKILL_CATEGORY_DATALIST_ID} />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Proficiency Level</span>
            <select value={model.level} onChange={(event) => update("level", event.target.value as SkillLevel)} className={inputClass}>
              {SKILL_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Description</span>
            <textarea value={model.description} onChange={(event) => update("description", event.target.value)} className={inputClass + " min-h-16"} placeholder="Programming language used for data analysis and machine learning workflows." />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Evidence</span>
            <textarea value={model.evidence} onChange={(event) => update("evidence", event.target.value)} className={inputClass + " min-h-16"} placeholder="Used in MSc thesis research for data processing and modelling." />
          </label>
        </div>

        <ProfileReferencePicker
          label="Related Experience / Projects"
          items={experienceEntries.map((experience) => ({ id: experience.id, title: experience.title }))}
          selectedIds={model.relatedExperienceIds}
          onChange={(next) => update("relatedExperienceIds", next)}
          emptyMessage="Add an entry in the Experience tab first, then link it here."
        />
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
          Cancel
        </button>
        <button type="button" onClick={handleSave} className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
          Save Skill
        </button>
      </div>
    </Modal>
  );
}
