"use client";

import { SKILL_CATEGORY_SUGGESTIONS } from "../../../_lib/types/profile-database";
import type { ExperienceEntry, SkillEntry } from "../../../_lib/types/profile-database";

type SkillListProps = Readonly<{
  entries: ReadonlyArray<SkillEntry>;
  experienceEntries: ReadonlyArray<ExperienceEntry>;
  onEdit: (entry: SkillEntry) => void;
  onDelete: (entryId: string) => void;
}>;

const levelAccent: Record<string, string> = {
  Beginner: "border-slate-700 bg-slate-800/60 text-slate-300",
  Intermediate: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
  Advanced: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  Expert: "border-purple-500/40 bg-purple-500/10 text-purple-200",
};

export default function SkillList({ entries, experienceEntries, onEdit, onDelete }: SkillListProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center">
        <h3 className="text-lg font-bold text-white">No skills yet</h3>
        <p className="mt-2 text-sm text-slate-400">Add technical and professional capabilities, each backed by evidence.</p>
      </div>
    );
  }

  // Suggested categories always lead, in their fixed order, so the layout
  // stays stable regardless of the order skills were added in. Any custom
  // category the user typed gets appended afterward, alphabetically.
  const usedCategories = new Set(entries.map((entry) => entry.category || "Uncategorized"));
  const knownCategories = SKILL_CATEGORY_SUGGESTIONS.filter((category) => usedCategories.has(category));
  const customCategories = Array.from(usedCategories)
    .filter((category) => !SKILL_CATEGORY_SUGGESTIONS.includes(category))
    .sort((first, second) => first.localeCompare(second));
  const categories = [...knownCategories, ...customCategories];

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <div key={category}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{category}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {entries
              .filter((entry) => (entry.category || "Uncategorized") === category)
              .map((entry) => {
                const linkedExperiences = experienceEntries.filter((experience) => entry.relatedExperienceIds.includes(experience.id));

                return (
                  <div key={entry.id} className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-lg font-bold text-white">{entry.name}</h3>
                        <span className={"rounded-lg border px-2 py-0.5 text-xs font-semibold " + (levelAccent[entry.level] ?? levelAccent.Beginner)}>{entry.level}</span>
                      </div>
                      {entry.description ? <p className="mt-2 text-sm text-slate-400">{entry.description}</p> : null}
                      {entry.evidence ? (
                        <p className="mt-2 text-sm text-slate-500">
                          <span className="font-semibold text-slate-400">Evidence: </span>
                          {entry.evidence}
                        </p>
                      ) : null}
                      {linkedExperiences.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {linkedExperiences.map((experience) => (
                            <span key={experience.id} className="rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs text-slate-300">
                              {experience.title}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => onEdit(entry)} className="flex-1 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-purple-400/60 hover:text-white">
                        Edit
                      </button>
                      <button type="button" onClick={() => onDelete(entry.id)} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-rose-300 transition hover:border-rose-400/60">
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
