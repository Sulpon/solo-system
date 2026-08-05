"use client";

import type { ExperienceEntry, SkillEntry } from "../../../_lib/types/profile-database";

type ExperienceListProps = Readonly<{
  entries: ReadonlyArray<ExperienceEntry>;
  skills: ReadonlyArray<SkillEntry>;
  onEdit: (entry: ExperienceEntry) => void;
  onDelete: (entryId: string) => void;
}>;

export default function ExperienceList({ entries, skills, onEdit, onDelete }: ExperienceListProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center">
        <h3 className="text-lg font-bold text-white">No experience entries yet</h3>
        <p className="mt-2 text-sm text-slate-400">Add research, projects, internships, or work that demonstrate your capabilities.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {entries.map((entry) => {
        const demonstratedSkills = skills.filter((skill) => skill.relatedExperienceIds.includes(entry.id));

        return (
          <div key={entry.id} className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">{entry.type}</p>
                {(entry.startDate || entry.endDate) ? (
                  <p className="text-xs text-slate-500">{entry.startDate || "—"} – {entry.endDate || "—"}</p>
                ) : null}
              </div>
              <h3 className="mt-1 text-lg font-bold text-white">{entry.title}</h3>
              {entry.organization ? <p className="mt-1 text-sm text-slate-300">{entry.organization}</p> : null}
              {entry.objective ? <p className="mt-3 text-sm text-slate-400">{entry.objective}</p> : null}
              {entry.results ? <p className="mt-2 text-sm text-slate-500">{entry.results}</p> : null}

              {demonstratedSkills.length > 0 ? (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Skills Demonstrated</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {demonstratedSkills.map((skill) => (
                      <span key={skill.id} className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-xs text-purple-200">
                        {skill.name}
                      </span>
                    ))}
                  </div>
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
  );
}
