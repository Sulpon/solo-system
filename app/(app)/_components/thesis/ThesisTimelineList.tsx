"use client";

import { TIMELINE_ITEM_KINDS, createTimelineItem } from "../../_lib/types/thesis-dashboard";
import type { TimelineItem, TimelineItemKind } from "../../_lib/types/thesis-dashboard";

type ThesisTimelineListProps = Readonly<{
  items: ReadonlyArray<TimelineItem>;
  onChange: (next: TimelineItem[]) => void;
}>;

const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";

const kindAccent: Record<TimelineItemKind, string> = {
  Milestone: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
  Deadline: "border-amber-500/40 bg-amber-500/10 text-amber-200",
};

function sortByDate(items: ReadonlyArray<TimelineItem>): TimelineItem[] {
  return [...items].sort((first, second) => {
    if (!first.date) return 1;
    if (!second.date) return -1;
    return first.date.localeCompare(second.date);
  });
}

export default function ThesisTimelineList({ items, onChange }: ThesisTimelineListProps) {
  function update(id: string, patch: Partial<TimelineItem>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function remove(id: string) {
    onChange(items.filter((item) => item.id !== id));
  }

  function add() {
    onChange([...items, createTimelineItem()]);
  }

  const sorted = sortByDate(items);

  return (
    <div className="space-y-2.5">
      {sorted.length === 0 ? <p className="text-sm text-slate-500">No milestones or deadlines yet.</p> : null}

      {sorted.map((item) => (
        <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/45 p-2.5">
          <select
            value={item.kind}
            onChange={(event) => update(item.id, { kind: event.target.value as TimelineItemKind })}
            className={"w-32 shrink-0 rounded-lg border px-2 py-2 text-xs font-semibold outline-none " + kindAccent[item.kind]}
          >
            {TIMELINE_ITEM_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
          <input value={item.title} onChange={(event) => update(item.id, { title: event.target.value })} placeholder="Title" className={inputClass + " min-w-[160px] flex-1"} />
          <input type="date" value={item.date} onChange={(event) => update(item.id, { date: event.target.value })} className={inputClass + " w-40 shrink-0"} />
          <button
            type="button"
            onClick={() => remove(item.id)}
            aria-label="Remove"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-rose-300 transition hover:bg-rose-500/10"
          >
            ×
          </button>
        </div>
      ))}

      <button type="button" onClick={add} className="rounded-xl border border-dashed border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 transition hover:border-emerald-400/50 hover:text-emerald-200">
        + Add Milestone / Deadline
      </button>
    </div>
  );
}
