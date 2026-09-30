"use client";

import type { KeyResult } from "../../../_lib/types/goal-tree";

type KeyResultsSummaryProps = Readonly<{
  keyResults: ReadonlyArray<KeyResult>;
}>;

// Read-only display of a node's existing Key Results.
//
// Deliberately separate from the progress bar beside it, and never folded
// into it: goal-tree.ts is explicit that Key Results are an OKR scoreboard
// and NOT part of a node's progress calculation, which always comes from
// the child rollup. Showing them together but visually distinct keeps that
// single source of truth intact while still surfacing the numbers.
//
// Editing stays in the Planning page's KeyResultsEditor - this view does
// not add a second editor for the same field.
export default function KeyResultsSummary({ keyResults }: KeyResultsSummaryProps) {
  if (keyResults.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-white/[0.07] pt-3">
      <p className="atlas-muted text-[0.6rem] font-semibold uppercase tracking-[0.24em]">Key Results</p>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {keyResults.map((keyResult) => {
          // Target can legitimately be 0 or missing on an older record;
          // dividing by it would render NaN%, so the bar simply stays empty
          // rather than showing a made-up figure.
          const target = Number(keyResult.targetValue) || 0;
          const current = Number(keyResult.currentValue) || 0;
          const percent = target > 0 ? Math.min(100, Math.max(0, Math.round((current / target) * 100))) : 0;

          return (
            <div key={keyResult.id} className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="atlas-muted truncate text-xs">{keyResult.title}</p>
                <p className="shrink-0 text-xs font-semibold text-white/90">
                  {current.toLocaleString()} / {target.toLocaleString()}
                  {keyResult.unit ? ` ${keyResult.unit}` : ""}
                </p>
              </div>
              <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div className="h-full rounded-full bg-amber-300/70" style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
