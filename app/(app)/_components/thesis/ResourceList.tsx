"use client";

import { RESOURCE_TYPES, createResourceEntry } from "../../_lib/types/resource";
import type { ResourceEntry, ResourceType } from "../../_lib/types/resource";

type ResourceListProps = Readonly<{
  entries: ReadonlyArray<ResourceEntry>;
  onChange: (next: ResourceEntry[]) => void;
}>;

const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";

export default function ResourceList({ entries, onChange }: ResourceListProps) {
  function update(id: string, patch: Partial<ResourceEntry>) {
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  function remove(id: string) {
    onChange(entries.filter((entry) => entry.id !== id));
  }

  return (
    <div className="space-y-2.5">
      {entries.length === 0 ? <p className="text-sm text-slate-500">No resources yet - papers, references, links, PDFs, and meeting notes all live here.</p> : null}

      {entries.map((entry) => (
        <div key={entry.id} className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={entry.type}
              onChange={(event) => update(entry.id, { type: event.target.value as ResourceType })}
              className="w-36 shrink-0 rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-2 text-xs font-semibold text-slate-300 outline-none focus:border-purple-400"
            >
              {RESOURCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <input value={entry.title} onChange={(event) => update(entry.id, { title: event.target.value })} placeholder="Title" className={inputClass + " min-w-[160px] flex-1 font-semibold text-white"} />
            <button type="button" onClick={() => remove(entry.id)} aria-label="Remove" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-rose-300 transition hover:bg-rose-500/10">
              ×
            </button>
          </div>
          <input value={entry.url} onChange={(event) => update(entry.id, { url: event.target.value })} placeholder="Link or file reference" className={inputClass + " mt-2"} />
          <textarea value={entry.notes} onChange={(event) => update(entry.id, { notes: event.target.value })} placeholder="Notes (optional)" className={inputClass + " mt-2 min-h-[2.5rem]"} />
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...entries, createResourceEntry()])}
        className="rounded-xl border border-dashed border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 transition hover:border-emerald-400/50 hover:text-emerald-200"
      >
        + Add Resource
      </button>
    </div>
  );
}
