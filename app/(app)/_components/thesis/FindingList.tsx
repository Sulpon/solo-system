"use client";

import { createFindingEntry } from "../../_lib/types/finding";
import type { FindingEntry } from "../../_lib/types/finding";

type FindingListProps = Readonly<{
  entries: ReadonlyArray<FindingEntry>;
  onChange: (next: FindingEntry[]) => void;
}>;

const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";

export default function FindingList({ entries, onChange }: FindingListProps) {
  function update(id: string, patch: Partial<FindingEntry>) {
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  function remove(id: string) {
    onChange(entries.filter((entry) => entry.id !== id));
  }

  return (
    <div className="space-y-2.5">
      {entries.length === 0 ? <p className="text-sm text-slate-500">No findings yet - conclusions worth carrying into the thesis will show up here.</p> : null}

      {entries.map((entry) => (
        <div key={entry.id} className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
          <div className="flex items-start gap-2">
            <input value={entry.title} onChange={(event) => update(entry.id, { title: event.target.value })} placeholder="Finding title" className={inputClass + " flex-1 font-semibold text-white"} />
            <button type="button" onClick={() => remove(entry.id)} aria-label="Remove" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-rose-300 transition hover:bg-rose-500/10">
              ×
            </button>
          </div>
          <textarea
            value={entry.content}
            onChange={(event) => update(entry.id, { content: event.target.value })}
            placeholder="What did you conclude, and why does it matter?"
            className={inputClass + " mt-2 min-h-[3rem]"}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...entries, createFindingEntry()])}
        className="rounded-xl border border-dashed border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 transition hover:border-emerald-400/50 hover:text-emerald-200"
      >
        + Add Finding
      </button>
    </div>
  );
}
