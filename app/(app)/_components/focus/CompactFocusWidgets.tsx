"use client";

import type { ChecklistItem } from "../../_lib/types/quest";

// Small presentational pieces shared by every compact Focus surface - the
// Tauri Focus Companion window (app/focus-companion/page.tsx) and the
// browser Focus Companion (BrowserFocusCompanion.tsx). Extracted so the two
// don't drift into two slightly-different checklist/progress-bar
// implementations; neither owns any Focus/completion state itself.
export function CompactProgressBar({ percent }: Readonly<{ percent: number }>) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
      <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-300" style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function CompactChecklistItem({ item, onToggle }: Readonly<{ item: ChecklistItem; onToggle: (itemId: string) => void }>) {
  return (
    <button
      type="button"
      onClick={() => onToggle(item.id)}
      className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs transition hover:bg-slate-900/60"
    >
      <span
        className={
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] " +
          (item.completed ? "border-emerald-400 bg-emerald-500/20 text-emerald-300" : "border-slate-600 text-transparent")
        }
      >
        ✓
      </span>
      <span className={"truncate " + (item.completed ? "text-slate-500 line-through" : "text-slate-200")}>{item.title}</span>
    </button>
  );
}
