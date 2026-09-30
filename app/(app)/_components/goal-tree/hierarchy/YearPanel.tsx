"use client";

import KeyResultsSummary from "./KeyResultsSummary";
import { HIERARCHY_LEVELS } from "./hierarchy-levels";
import type { GoalNode } from "../../../_lib/types/goal-tree";

type YearPanelProps = Readonly<{
  annualGoal: GoalNode;
  meta?: string;
  quarterlyGoalCount: number;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}>;

// The Year is the campaign the rest of the page hangs off, so it gets its
// own full-width panel rather than a card in a grid: larger type, the full
// vision text (not clamped), its Key Results, and a wider progress bar.
// Everything shown is the node's own stored data or its existing rolled-up
// progress.
export default function YearPanel({ annualGoal, meta, quarterlyGoalCount, selected, onSelect, onEdit }: YearPanelProps) {
  const { accentText, accentFill, accentBorder, accentWash } = HIERARCHY_LEVELS.year;
  const progress = Math.min(100, Math.max(0, Math.round(annualGoal.progress)));

  return (
    <div
      data-testid={`year-card-${annualGoal.id}`}
      data-selected={selected ? "true" : "false"}
      className={"relative overflow-hidden rounded-2xl border p-5 transition duration-200 md:p-6 " + accentBorder + " " + (selected ? accentWash + " ring-1 ring-amber-200/20" : "bg-white/[0.02]")}
    >
      {/* A single restrained wash, not a glow on every element. */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_80%_20%,rgba(251,191,36,0.10),transparent_60%)]" />

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <button type="button" onClick={onSelect} aria-pressed={selected} className="min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
            {meta ? <p className={"text-[0.62rem] font-semibold uppercase tracking-[0.28em] " + accentText}>{meta}</p> : null}
            <h2 className="atlas-display mt-1.5 text-xl font-bold tracking-tight text-white md:text-2xl">{annualGoal.title}</h2>
            {annualGoal.description ? <p className="atlas-muted mt-2 max-w-3xl text-sm leading-relaxed">{annualGoal.description}</p> : null}
          </button>

          <div className="flex shrink-0 items-center gap-3">
            <div className="text-right">
              <p className="atlas-display text-2xl font-bold text-white md:text-3xl">{progress}%</p>
              <p className="atlas-muted text-[0.6rem] uppercase tracking-[0.2em]">Complete</p>
            </div>
            <button type="button" onClick={onEdit} className="atlas-muted rounded-lg border border-white/10 px-3 py-1.5 text-xs transition hover:text-white">
              Edit
            </button>
          </div>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
          <div className={"h-full rounded-full transition-all duration-500 " + accentFill} style={{ width: `${progress}%` }} />
        </div>

        <p className="atlas-muted mt-2 text-[0.68rem]">
          {quarterlyGoalCount} {quarterlyGoalCount === 1 ? "quarterly goal" : "quarterly goals"}
        </p>

        <KeyResultsSummary keyResults={annualGoal.keyResults ?? []} />
      </div>
    </div>
  );
}
