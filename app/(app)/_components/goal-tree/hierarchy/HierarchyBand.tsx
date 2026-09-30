"use client";

import { HIERARCHY_LEVELS, type HierarchyLevelId } from "./hierarchy-levels";

type HierarchyBandProps = Readonly<{
  level: HierarchyLevelId;
  // Short, honest context for this band, e.g. "3 quarterly goals" or the
  // parent's title. Never a claim about progress.
  caption?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  // Drawn on every band except the last, so the chain reads as one
  // hierarchy rather than five stacked lists.
  showConnector?: boolean;
  // Dimmed when the band has no selected parent to show children for -
  // the level stays visible (so the full chain is always legible) but
  // recedes instead of competing with the active path.
  muted?: boolean;
  testId?: string;
}>;

// One level of the hierarchy: a rail carrying the level name and the
// connecting thread, and the content for that level beside it.
//
// The thread lives INSIDE the rail column rather than being absolutely
// positioned at a hardcoded offset, so it stays aligned with the level dot
// at every breakpoint and cannot drift when the rail's width changes. On
// mobile the rail collapses to a horizontal label above the content and
// the vertical thread is dropped - there it would cut through content
// rather than connect it.
export default function HierarchyBand({ level, caption, actions, children, showConnector = true, muted = false, testId }: HierarchyBandProps) {
  const { label, accentText, accentFill } = HIERARCHY_LEVELS[level];

  return (
    <section data-testid={testId} data-level={level} className={"flex flex-col gap-2 md:flex-row md:gap-5 " + (muted ? "opacity-60" : "")}>
      <div className="flex shrink-0 items-center gap-3 md:w-20 md:flex-col md:items-end md:gap-0 md:self-stretch">
        <span className={"shrink-0 text-[0.6rem] font-semibold uppercase tracking-[0.28em] " + accentText}>{label}</span>

        {/* Mobile: a hairline that fills the row beside the label. */}
        <span aria-hidden className={"h-px flex-1 md:hidden " + accentFill + " opacity-25"} />

        {/* Desktop: the level dot, then the thread down to the next band. */}
        <span aria-hidden className={"mt-2 hidden h-1.5 w-1.5 shrink-0 rounded-full md:block " + accentFill} />
        {showConnector ? <span aria-hidden className="hidden w-px flex-1 bg-gradient-to-b from-white/15 to-white/[0.03] md:block" /> : null}
      </div>

      <div className="min-w-0 flex-1 pb-6">
        {caption || actions ? (
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            {caption ? <p className="atlas-muted min-w-0 text-xs">{caption}</p> : <span />}
            {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        ) : null}

        {children}
      </div>
    </section>
  );
}
