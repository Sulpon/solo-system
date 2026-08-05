"use client";

import type { EducationEntry } from "../../../_lib/types/profile-database";

type EducationListProps = Readonly<{
  entries: ReadonlyArray<EducationEntry>;
  onEdit: (entry: EducationEntry) => void;
  onDelete: (entryId: string) => void;
}>;

export default function EducationList({ entries, onEdit, onDelete }: EducationListProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center">
        <h3 className="text-lg font-bold text-white">No education entries yet</h3>
        <p className="mt-2 text-sm text-slate-400">Add your formal education background - degree, institution, and field of study.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {entries.map((entry) => (
        <div key={entry.id} className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">{entry.status || "Education"}</p>
            <h3 className="mt-1 text-lg font-bold text-white">{entry.degree}</h3>
            <p className="mt-1 text-sm text-slate-300">{entry.institution}{entry.location ? ` · ${entry.location}` : ""}</p>
            {entry.fieldOfStudy ? <p className="mt-2 text-sm text-slate-400">{entry.fieldOfStudy}</p> : null}
            {entry.specialization ? <p className="mt-1 text-sm text-slate-500">{entry.specialization}</p> : null}
            {(entry.startDate || entry.endDate) ? (
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {entry.startDate || "—"} – {entry.endDate || "—"}
              </p>
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
      ))}
    </div>
  );
}
