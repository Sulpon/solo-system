"use client";

import KeyResultsSummary from "./KeyResultsSummary";
import { HIERARCHY_LEVELS, type HierarchyLevelId } from "./hierarchy-levels";
import type { KeyResult } from "../../../_lib/types/goal-tree";

type HierarchyCardProps = Readonly<{
  level: HierarchyLevelId;
  title: string;
  // The node's real date range, already formatted by the caller from
  // periodStart/periodEnd. Omitted when the node carries no period.
  meta?: string;
  description?: string;
  // 0-100, always the node's computed progress from the existing rollup -
  // never a value this component derives.
  progress: number;
  // e.g. "3 monthly goals". Counts of real children only.
  childSummary?: string;
  keyResults?: ReadonlyArray<KeyResult>;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  testId?: string;
}>;

// One node at any level below Year. Selection drives the drill-down:
// choosing a card reveals that node's children in the band below, which is
// what turns five bands into one navigable hierarchy.
//
// The card is a <div> with a <button> body rather than one big button, so
// the Edit control can sit inside it - a button nested in a button is
// invalid HTML and browsers drop the inner one. The body button still
// gives keyboard focus, Enter/Space and a real pressed state.
export default function HierarchyCard({ level, title, meta, description, progress, childSummary, keyResults, selected = false, onSelect, onEdit, testId }: HierarchyCardProps) {
  const { accentBorder, accentFill, accentWash, accentText } = HIERARCHY_LEVELS[level];
  const clamped = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <div
      data-testid={testId}
      data-selected={selected ? "true" : "false"}
      className={
        "min-w-0 rounded-xl border p-3.5 transition duration-200 " +
        accentBorder +
        " " +
        // The selected card carries the path the lower bands are showing,
        // so it needs to be unmistakable, not a one-pixel difference.
        (selected ? accentWash + " ring-1 ring-white/20 shadow-[0_0_24px_rgba(255,255,255,0.04)]" : "bg-white/[0.02] hover:bg-white/[0.05]")
      }
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          aria-pressed={selected}
          onClick={onSelect}
          disabled={!onSelect}
          className="min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-default"
        >
          <p className="atlas-display truncate text-sm font-semibold text-white">{title}</p>
          {meta ? <p className={"mt-0.5 truncate text-[0.66rem] " + accentText}>{meta}</p> : null}
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <span className="atlas-display text-sm font-bold text-white/90">{clamped}%</span>
          {onEdit ? (
            <button type="button" onClick={onEdit} aria-label={`Edit ${title}`} className="atlas-muted rounded border border-white/10 px-1.5 py-0.5 text-[0.6rem] transition hover:text-white">
              Edit
            </button>
          ) : null}
        </div>
      </div>

      {description ? <p className="atlas-muted mt-1.5 line-clamp-2 text-xs">{description}</p> : null}

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.07]">
        <div className={"h-full rounded-full transition-all duration-300 " + accentFill} style={{ width: `${clamped}%` }} />
      </div>

      {childSummary ? <p className="atlas-muted mt-2 truncate text-[0.66rem]">{childSummary}</p> : null}

      {keyResults ? <KeyResultsSummary keyResults={keyResults} /> : null}
    </div>
  );
}
