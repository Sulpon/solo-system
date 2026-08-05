"use client";

import { RESEARCH_NOTE_TYPES, createResearchNoteEntry } from "../../_lib/types/research-note";
import type { ResearchNoteEntry, ResearchNoteType } from "../../_lib/types/research-note";

type ResearchNoteListProps = Readonly<{
  entries: ReadonlyArray<ResearchNoteEntry>;
  onChange: (next: ResearchNoteEntry[]) => void;
}>;

const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";

export default function ResearchNoteList({ entries, onChange }: ResearchNoteListProps) {
  function update(id: string, patch: Partial<ResearchNoteEntry>) {
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  function remove(id: string) {
    onChange(entries.filter((entry) => entry.id !== id));
  }

  return (
    <div className="space-y-2.5">
      {entries.length === 0 ? <p className="text-sm text-slate-500">No research notes yet - capture ideas, questions, hypotheses, and observations as they come up.</p> : null}

      {entries.map((entry) => (
        <div key={entry.id} className="flex flex-wrap items-start gap-2 rounded-xl border border-slate-800 bg-slate-950/45 p-3">
          <select
            value={entry.type}
            onChange={(event) => update(entry.id, { type: event.target.value as ResearchNoteType })}
            className="w-36 shrink-0 rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-2 text-xs font-semibold text-slate-300 outline-none focus:border-purple-400"
          >
            {RESEARCH_NOTE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <textarea
            value={entry.content}
            onChange={(event) => update(entry.id, { content: event.target.value })}
            placeholder="What's on your mind?"
            className={inputClass + " min-h-[2.5rem] min-w-[200px] flex-1"}
          />
          <button type="button" onClick={() => remove(entry.id)} aria-label="Remove" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-rose-300 transition hover:bg-rose-500/10">
            ×
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...entries, createResearchNoteEntry()])}
        className="rounded-xl border border-dashed border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 transition hover:border-emerald-400/50 hover:text-emerald-200"
      >
        + Add Note
      </button>
    </div>
  );
}
