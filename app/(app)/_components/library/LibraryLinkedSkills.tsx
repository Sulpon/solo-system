"use client";

import { useState } from "react";
import Link from "next/link";
import { useSkillEntries } from "../../_lib/hooks/useSkillEntries";

type LibraryLinkedSkillsProps = Readonly<{
  linkedSkillIds: ReadonlyArray<string>;
  onLink: (skillId: string) => void;
  onUnlink: (skillId: string) => void;
}>;

// Only rendered when a real, persistent Skill entity exists to link against
// (see the Career Hub's Profile Database - SkillEntry, STORAGE_KEYS.skillEntries).
// Per section 21 of the spec: no fake Skill system invented for Library.
export default function LibraryLinkedSkills({ linkedSkillIds, onLink, onUnlink }: LibraryLinkedSkillsProps) {
  const { entries } = useSkillEntries();
  const [picking, setPicking] = useState(false);
  const linkedSkills = linkedSkillIds.map((id) => entries.find((entry) => entry.id === id)).filter((entry) => Boolean(entry));
  const availableSkills = entries.filter((entry) => !linkedSkillIds.includes(entry.id));

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-slate-800 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Linked Skills</p>
        {availableSkills.length > 0 && !picking ? (
          <button type="button" onClick={() => setPicking(true)} className="rounded-lg border border-purple-400/50 bg-purple-500/15 px-3 py-1.5 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/25">
            + Link Skill
          </button>
        ) : null}
      </div>

      {picking ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) onLink(event.target.value);
              setPicking(false);
            }}
            className="rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-purple-400"
          >
            <option value="" disabled>
              Select a skill...
            </option>
            {availableSkills.map((skill) => (
              <option key={skill.id} value={skill.id}>
                {skill.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setPicking(false)} className="text-xs text-slate-500 transition hover:text-white">
            Cancel
          </button>
        </div>
      ) : null}

      {linkedSkills.length === 0 && !picking ? <p className="mt-3 text-sm text-slate-500">No skills linked yet.</p> : null}

      {linkedSkills.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {linkedSkills.map((skill) => (
            <div key={skill!.id} className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/50 py-1 pl-3 pr-1.5 text-xs">
              <Link href="/career-hub/profile" className="font-semibold text-white hover:text-purple-200">
                {skill!.name}
              </Link>
              <button type="button" onClick={() => onUnlink(skill!.id)} className="text-slate-500 transition hover:text-rose-300" aria-label={`Unlink ${skill!.name}`}>
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
