"use client";

import { useState } from "react";

type EditableStringListProps = Readonly<{
  items: ReadonlyArray<string>;
  onChange: (next: string[]) => void;
  placeholder?: string;
}>;

const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";

export default function EditableStringList({ items, onChange, placeholder = "Add an item" }: EditableStringListProps) {
  const [draft, setDraft] = useState("");

  function addItem() {
    const value = draft.trim();

    if (!value) {
      return;
    }

    onChange([...items, value]);
    setDraft("");
  }

  function updateAt(index: number, value: string) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  function removeAt(index: number) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  function moveAt(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= items.length) {
      return;
    }

    const next = [...items];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-2.5">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/45 p-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-slate-500">{index + 1}</span>
          <input value={item} onChange={(event) => updateAt(index, event.target.value)} className={inputClass} />
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => moveAt(index, -1)}
              disabled={index === 0}
              aria-label="Move up"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 text-xs text-slate-400 transition hover:border-purple-400/50 hover:text-white disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveAt(index, 1)}
              disabled={index === items.length - 1}
              aria-label="Move down"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 text-xs text-slate-400 transition hover:border-purple-400/50 hover:text-white disabled:opacity-30"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => removeAt(index)}
              aria-label="Remove item"
              className="flex h-7 w-7 items-center justify-center rounded-md text-rose-300 transition hover:bg-rose-500/10"
            >
              ×
            </button>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem();
            }
          }}
          placeholder={placeholder}
          className={inputClass}
        />
        <button
          type="button"
          onClick={addItem}
          className="shrink-0 rounded-lg border border-dashed border-slate-700 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:border-emerald-400/50 hover:text-emerald-200"
        >
          + Add
        </button>
      </div>
    </div>
  );
}
