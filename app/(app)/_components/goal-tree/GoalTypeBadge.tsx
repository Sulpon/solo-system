"use client";

import type { GoalNodeType } from "../../_lib/types/goal-tree";

type GoalTypeBadgeProps = Readonly<{
  type: GoalNodeType;
  compact?: boolean;
}>;

const badgeStyles: Record<GoalNodeType, string> = {
  dream: "border-purple-400/30 bg-purple-500/10 text-purple-200",
  long_term_goal: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
  milestone: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  quest: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  progress_goal: "border-orange-400/30 bg-orange-400/10 text-orange-100",
  sequential_milestone: "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100",
};

const typeLabels: Record<GoalNodeType, string> = {
  dream: "Dream",
  long_term_goal: "Goal",
  milestone: "Milestone",
  quest: "Quest",
  progress_goal: "Progress Goal",
  sequential_milestone: "Sequential Milestone",
};

const compactTypeLabels: Record<GoalNodeType, string> = {
  dream: "Dream",
  long_term_goal: "Goal",
  milestone: "Milestone",
  quest: "Quest",
  progress_goal: "Progress Goal",
  sequential_milestone: "Seq. Milestone",
};

function TypeGlyph({ type }: GoalTypeBadgeProps) {
  const glyphClass = "h-3.5 w-3.5 shrink-0";

  switch (type) {
    case "dream":
      return (
        <svg viewBox="0 0 16 16" className={glyphClass} fill="none" aria-hidden="true">
          <path d="M8 1.5L13 8L8 14.5L3 8L8 1.5Z" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "long_term_goal":
      return (
        <svg viewBox="0 0 16 16" className={glyphClass} fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="8" cy="8" r="2" fill="currentColor" />
        </svg>
      );
    case "milestone":
      return (
        <svg viewBox="0 0 16 16" className={glyphClass} fill="none" aria-hidden="true">
          <path d="M3 12.5V3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M3 4.5H11L9.8 7L11 9.5H3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case "progress_goal":
      return (
        <svg viewBox="0 0 16 16" className={glyphClass} fill="none" aria-hidden="true">
          <path d="M2.5 12.5H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="4" y="8.5" width="1.8" height="3" rx="0.6" fill="currentColor" />
          <rect x="7.1" y="6.5" width="1.8" height="5" rx="0.6" fill="currentColor" />
          <rect x="10.2" y="4.5" width="1.8" height="7" rx="0.6" fill="currentColor" />
        </svg>
      );
    case "sequential_milestone":
      return (
        <svg viewBox="0 0 16 16" className={glyphClass} fill="none" aria-hidden="true">
          <path d="M4 4.5H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M4 8H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M4 11.5H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="2.5" cy="4.5" r="1" fill="currentColor" />
          <circle cx="2.5" cy="8" r="1" fill="currentColor" />
          <circle cx="2.5" cy="11.5" r="1" fill="currentColor" />
        </svg>
      );
    case "quest":
    default:
      return (
        <svg viewBox="0 0 16 16" className={glyphClass} fill="none" aria-hidden="true">
          <rect x="3" y="3" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 8.5L7.1 10.5L11 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

export default function GoalTypeBadge({ type, compact = false }: GoalTypeBadgeProps) {
  const outerClassName = compact
    ? "inline-flex max-w-full shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
    : "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]";

  const glyphWrapperClassName = compact
    ? "inline-flex h-4.5 w-4.5 items-center justify-center rounded-full border border-current/25 bg-black/15"
    : "inline-flex h-5 w-5 items-center justify-center rounded-full border border-current/25 bg-black/15";

  return (
    <span className={outerClassName + " " + badgeStyles[type]}>
      <span className={glyphWrapperClassName}>
        <TypeGlyph type={type} />
      </span>
      <span className="truncate">{compact ? compactTypeLabels[type] : typeLabels[type]}</span>
    </span>
  );
}
