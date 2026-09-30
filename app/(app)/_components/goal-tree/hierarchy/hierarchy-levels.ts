// The five planning levels, defined once.
//
// Each level gets one restrained accent so YEAR / QUARTER / MONTH / WEEK /
// DAY are distinguishable at a glance without any card inventing its own
// colour - the same discipline the domain-theme registry applies to pages.
// Gold descends to teal as the horizon shortens, so "how far out is this?"
// is readable from colour alone.

export type HierarchyLevelId = "year" | "quarter" | "month" | "week" | "day";

export type HierarchyLevel = Readonly<{
  id: HierarchyLevelId;
  label: string;
  // Tailwind text colour for the level rail and eyebrow.
  accentText: string;
  // Border colour for cards at this level.
  accentBorder: string;
  // Fill for the level's progress bar.
  accentFill: string;
  // Soft background wash for the selected card.
  accentWash: string;
}>;

export const HIERARCHY_LEVELS: Readonly<Record<HierarchyLevelId, HierarchyLevel>> = {
  year: { id: "year", label: "Year", accentText: "text-amber-200/90", accentBorder: "border-amber-300/25", accentFill: "bg-amber-300/80", accentWash: "bg-amber-300/[0.07]" },
  quarter: { id: "quarter", label: "Quarter", accentText: "text-sky-200/90", accentBorder: "border-sky-300/25", accentFill: "bg-sky-300/80", accentWash: "bg-sky-300/[0.07]" },
  month: { id: "month", label: "Month", accentText: "text-cyan-200/90", accentBorder: "border-cyan-300/25", accentFill: "bg-cyan-300/80", accentWash: "bg-cyan-300/[0.07]" },
  week: { id: "week", label: "Week", accentText: "text-teal-200/90", accentBorder: "border-teal-300/25", accentFill: "bg-teal-300/80", accentWash: "bg-teal-300/[0.07]" },
  day: { id: "day", label: "Day", accentText: "text-slate-300", accentBorder: "border-slate-400/20", accentFill: "bg-slate-300/80", accentWash: "bg-white/[0.04]" },
};

export const HIERARCHY_LEVEL_ORDER: ReadonlyArray<HierarchyLevelId> = ["year", "quarter", "month", "week", "day"];
