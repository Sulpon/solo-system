"use client";

import { useState } from "react";
import Card from "../Card";
import CareerHubBackLink from "../career/CareerHubBackLink";
import { useEducationEntries } from "../../_lib/hooks/useEducationEntries";
import { useSkillEntries } from "../../_lib/hooks/useSkillEntries";
import { useExperienceEntries } from "../../_lib/hooks/useExperienceEntries";
import { createProfileEntryId } from "../../_lib/types/profile-database";
import type { EducationEntry, ExperienceEntry, SkillEntry } from "../../_lib/types/profile-database";
import EducationList from "./education/EducationList";
import EducationForm, { createEmptyEducationForm, educationEntryToForm, type EducationFormModel } from "./education/EducationForm";
import SkillList from "./skills/SkillList";
import SkillForm, { createEmptySkillForm, skillEntryToForm, type SkillFormModel } from "./skills/SkillForm";
import ExperienceList from "./experience/ExperienceList";
import ExperienceForm, { createEmptyExperienceForm, experienceEntryToForm, type ExperienceFormModel } from "./experience/ExperienceForm";

type ProfileDatabaseTab = "education" | "skills" | "experience";

const tabs: ReadonlyArray<{ id: ProfileDatabaseTab; label: string }> = [
  { id: "education", label: "Education" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
];

export default function ProfileDatabasePageClient() {
  const [tab, setTab] = useState<ProfileDatabaseTab>("education");

  const { entries: educationEntries, setEntries: setEducationEntries, hasLoaded: educationLoaded } = useEducationEntries();
  const { entries: skillEntries, setEntries: setSkillEntries, hasLoaded: skillsLoaded } = useSkillEntries();
  const { entries: experienceEntries, setEntries: setExperienceEntries, hasLoaded: experienceLoaded } = useExperienceEntries();

  const [educationForm, setEducationForm] = useState<EducationFormModel | null>(null);
  const [skillForm, setSkillForm] = useState<SkillFormModel | null>(null);
  const [experienceForm, setExperienceForm] = useState<ExperienceFormModel | null>(null);

  if (!educationLoaded || !skillsLoaded || !experienceLoaded) {
    return null;
  }

  function saveEducation(form: EducationFormModel) {
    if (form.id) {
      setEducationEntries((current) => current.map((entry) => (entry.id === form.id ? { ...entry, ...form, id: entry.id } : entry)));
    } else {
      const newEntry: EducationEntry = { ...form, id: createProfileEntryId("education") };
      setEducationEntries((current) => [...current, newEntry]);
    }

    setEducationForm(null);
  }

  function deleteEducation(entryId: string) {
    setEducationEntries((current) => current.filter((entry) => entry.id !== entryId));
  }

  function saveSkill(form: SkillFormModel) {
    if (form.id) {
      setSkillEntries((current) => current.map((entry) => (entry.id === form.id ? { ...entry, ...form, id: entry.id } : entry)));
    } else {
      const newEntry: SkillEntry = { ...form, id: createProfileEntryId("skill") };
      setSkillEntries((current) => [...current, newEntry]);
    }

    setSkillForm(null);
  }

  function deleteSkill(entryId: string) {
    setSkillEntries((current) => current.filter((entry) => entry.id !== entryId));
  }

  function saveExperience(form: ExperienceFormModel) {
    if (form.id) {
      setExperienceEntries((current) => current.map((entry) => (entry.id === form.id ? { ...entry, ...form, id: entry.id } : entry)));
    } else {
      const newEntry: ExperienceEntry = { ...form, id: createProfileEntryId("experience") };
      setExperienceEntries((current) => [...current, newEntry]);
    }

    setExperienceForm(null);
  }

  function deleteExperience(entryId: string) {
    setExperienceEntries((current) => current.filter((entry) => entry.id !== entryId));
    // A skill's relatedExperienceIds is the one place this link lives - once
    // the experience is gone, strip it there too so nothing points at a
    // deleted entry.
    setSkillEntries((current) => current.map((skill) => ({ ...skill, relatedExperienceIds: skill.relatedExperienceIds.filter((id) => id !== entryId) })));
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-500/20 bg-slate-950/45 p-5 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <CareerHubBackLink />
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Career Hub</p>
        <h1 className="mt-2 text-3xl font-black text-white">🧬 Profile Database</h1>
        <p className="mt-2 text-sm text-slate-400">Your education, skills, and experience - the single source of truth for future CV and job application modules.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={
                "rounded-xl border px-4 py-2 text-sm transition " +
                (tab === item.id
                  ? "border-purple-400/60 bg-purple-500/15 text-white shadow-[0_0_18px_rgba(168,85,247,0.14)]"
                  : "border-slate-700 bg-slate-950/45 text-slate-300 hover:border-purple-400/50 hover:text-white")
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-5">
        {tab === "education" ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Education</p>
                <h2 className="mt-2 text-xl font-black text-white">Formal education</h2>
              </div>
              <button type="button" onClick={() => setEducationForm(createEmptyEducationForm())} className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
                + Add Education
              </button>
            </div>
            <div className="mt-5">
              <EducationList entries={educationEntries} onEdit={(entry) => setEducationForm(educationEntryToForm(entry))} onDelete={deleteEducation} />
            </div>
          </>
        ) : null}

        {tab === "skills" ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Skills</p>
                <h2 className="mt-2 text-xl font-black text-white">Capabilities, with evidence</h2>
              </div>
              <button type="button" onClick={() => setSkillForm(createEmptySkillForm())} className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
                + Add Skill
              </button>
            </div>
            <div className="mt-5">
              <SkillList entries={skillEntries} experienceEntries={experienceEntries} onEdit={(entry) => setSkillForm(skillEntryToForm(entry))} onDelete={deleteSkill} />
            </div>
          </>
        ) : null}

        {tab === "experience" ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Experience</p>
                <h2 className="mt-2 text-xl font-black text-white">Research, projects, and work</h2>
              </div>
              <button type="button" onClick={() => setExperienceForm(createEmptyExperienceForm())} className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
                + Add Experience
              </button>
            </div>
            <div className="mt-5">
              <ExperienceList entries={experienceEntries} skills={skillEntries} onEdit={(entry) => setExperienceForm(experienceEntryToForm(entry))} onDelete={deleteExperience} />
            </div>
          </>
        ) : null}
      </Card>

      {educationForm ? <EducationForm form={educationForm} isEditing={Boolean(educationForm.id)} onCancel={() => setEducationForm(null)} onSave={saveEducation} /> : null}
      {skillForm ? <SkillForm form={skillForm} isEditing={Boolean(skillForm.id)} experienceEntries={experienceEntries} onCancel={() => setSkillForm(null)} onSave={saveSkill} /> : null}
      {experienceForm ? <ExperienceForm form={experienceForm} isEditing={Boolean(experienceForm.id)} onCancel={() => setExperienceForm(null)} onSave={saveExperience} /> : null}
    </div>
  );
}
