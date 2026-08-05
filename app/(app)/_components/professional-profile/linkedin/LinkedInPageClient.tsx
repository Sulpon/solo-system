"use client";

import Link from "next/link";
import Card from "../../Card";
import EditableStringList from "../../EditableStringList";
import ProfileReferencePicker from "../ProfileReferencePicker";
import { useLinkedInProfile } from "../../../_lib/hooks/useLinkedInProfile";
import { useExperienceEntries } from "../../../_lib/hooks/useExperienceEntries";
import { useSkillEntries } from "../../../_lib/hooks/useSkillEntries";
import type { LinkedInProfile } from "../../../_lib/types/linkedin-profile";

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";
const sectionLabelClass = "text-xs font-semibold uppercase tracking-[0.22em] text-purple-300";

export default function LinkedInPageClient() {
  const { profile, setProfile, hasLoaded } = useLinkedInProfile();
  const { entries: experienceEntries, hasLoaded: experienceLoaded } = useExperienceEntries();
  const { entries: skillEntries, hasLoaded: skillsLoaded } = useSkillEntries();

  if (!hasLoaded || !experienceLoaded || !skillsLoaded) {
    return null;
  }

  function update(patch: Partial<LinkedInProfile>) {
    setProfile((current) => ({ ...current, ...patch }));
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-500/20 bg-slate-950/45 p-5 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <Link
          href="/career-hub/professional-profile"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-purple-300"
        >
          ← Professional Profile
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Professional Profile</p>
        <h1 className="mt-2 text-3xl font-black text-white">LinkedIn</h1>
        <p className="mt-2 text-sm text-slate-400">A mirror of your LinkedIn profile - Experience and Skills reference the Profile Database instead of restating it.</p>
      </div>

      <Card className="p-5">
        <p className={sectionLabelClass}>Headline & About</p>
        <div className="mt-3 space-y-4">
          <label className="space-y-2 block">
            <span className={labelClass}>Headline</span>
            <input value={profile.headline} onChange={(event) => update({ headline: event.target.value })} className={inputClass} />
          </label>
          <label className="space-y-2 block">
            <span className={labelClass}>About</span>
            <textarea value={profile.about} onChange={(event) => update({ about: event.target.value })} className={inputClass + " min-h-32"} />
          </label>
        </div>
      </Card>

      <Card className="p-5">
        <p className={sectionLabelClass}>Experience & Skills</p>
        <p className="mt-2 text-sm text-slate-400">Selected from your Profile Database.</p>
        <div className="mt-4 space-y-5">
          <ProfileReferencePicker
            label="Experience"
            items={experienceEntries.map((experience) => ({ id: experience.id, title: experience.title }))}
            selectedIds={profile.experienceIds}
            onChange={(next) => update({ experienceIds: next })}
            emptyMessage="Add an entry in the Profile Database first, then include it here."
          />
          <ProfileReferencePicker
            label="Skills"
            items={skillEntries.map((skill) => ({ id: skill.id, title: skill.name, subtitle: skill.category }))}
            selectedIds={profile.skillIds}
            onChange={(next) => update({ skillIds: next })}
            emptyMessage="Add an entry in the Profile Database first, then include it here."
          />
        </div>
      </Card>

      <Card className="p-5">
        <p className={sectionLabelClass}>Featured</p>
        <div className="mt-3">
          <EditableStringList items={profile.featured} onChange={(next) => update({ featured: next })} placeholder="Add a featured item or link" />
        </div>
      </Card>

      <Card className="p-5">
        <p className={sectionLabelClass}>Certifications</p>
        <div className="mt-3">
          <EditableStringList items={profile.certifications} onChange={(next) => update({ certifications: next })} placeholder="Add a certification" />
        </div>
      </Card>

      <Card className="p-5">
        <p className={sectionLabelClass}>Projects</p>
        <div className="mt-3">
          <EditableStringList items={profile.projects} onChange={(next) => update({ projects: next })} placeholder="Add a project" />
        </div>
      </Card>

      <Card className="p-5">
        <p className={sectionLabelClass}>Notes</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClass}>Last Updated</span>
            <input type="date" value={profile.lastUpdated} onChange={(event) => update({ lastUpdated: event.target.value })} className={inputClass} />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Notes</span>
            <textarea value={profile.notes} onChange={(event) => update({ notes: event.target.value })} className={inputClass + " min-h-20"} />
          </label>
        </div>
      </Card>
    </div>
  );
}
