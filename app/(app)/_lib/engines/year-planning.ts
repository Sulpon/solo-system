import { getLocalDayKey, parseLocalDayKey } from "../local-day";
import { getQuarterRange, type QuarterRange } from "./planning-engine";
import type { GoalNode, GoalTree } from "../types/goal-tree";

// The Year level of the Goal Tree hierarchy.
//
// A deliberate extension of planning-engine.ts rather than a replacement:
// that module already owns quarter/month/week math and every downstream
// traversal (getMonthlyMilestones, getWeeklyMilestones,
// getQuestsForWeeklyMilestone). This adds only the one level it did not
// have, in the same style - a year is never stored as an entity, it is
// calendar math plus a lookup over the same single GoalNode tree.
//
// An Annual Goal is a Dream carrying periodType "year" (see
// GoalNodePeriodType). Dreams without a period are not annual goals; they
// are undated, ongoing directions, and getUndatedDreams keeps them
// reachable so the new view can never hide data the old one showed.

export type YearRange = Readonly<{ year: number; start: Date; end: Date; label: string }>;

export function getYearRange(year: number): YearRange {
  return { year, start: new Date(year, 0, 1), end: new Date(year, 11, 31), label: String(year) };
}

export function getCurrentYear(referenceDate = new Date()): number {
  return referenceDate.getFullYear();
}

export function getQuartersInYear(year: number): QuarterRange[] {
  return ([1, 2, 3, 4] as const).map((quarterIndex) => getQuarterRange({ year, quarterIndex }));
}

// Same containment rule as planning-engine's startsWithin, and for the same
// reason: periodStart is a date-only key, so it must be re-parsed with
// parseLocalDayKey - `new Date("2026-01-01")` is UTC midnight and lands in
// the previous year for any timezone behind UTC.
function startsWithinYear(node: GoalNode, range: YearRange): boolean {
  if (!node.periodStart) return false;
  const nodeStart = parseLocalDayKey(node.periodStart);
  return nodeStart >= range.start && nodeStart <= range.end;
}

export function isAnnualGoal(node: GoalNode): boolean {
  return node.type === "dream" && node.periodType === "year";
}

// Annual Goals are always roots: a Dream is a root node in this tree, and
// nothing above it exists.
export function findAnnualGoalsForYear(goalTree: GoalTree, year: number): ReadonlyArray<GoalNode> {
  const range = getYearRange(year);
  return goalTree.filter((node) => isAnnualGoal(node) && startsWithinYear(node, range));
}

// Dreams with no period at all. They predate the Year level (or the user
// simply never dated them) and must stay visible - silently dropping them
// from the hierarchy view would look like data loss.
export function getUndatedDreams(goalTree: GoalTree): ReadonlyArray<GoalNode> {
  return goalTree.filter((node) => node.type === "dream" && !node.periodType);
}

// Every year that has at least one Annual Goal, plus the current year, so
// the selector always offers somewhere to start. Ascending.
export function getYearsWithGoals(goalTree: GoalTree, referenceDate = new Date()): ReadonlyArray<number> {
  const years = new Set<number>([getCurrentYear(referenceDate)]);

  for (const node of goalTree) {
    if (isAnnualGoal(node) && node.periodStart) {
      years.add(parseLocalDayKey(node.periodStart).getFullYear());
    }
  }

  return [...years].sort((first, second) => first - second);
}

// The quarterly children of one Annual Goal, restricted to that goal's own
// year. Reads the node's real children rather than scanning the whole tree,
// so a quarterly goal can never appear under two different years.
export function getQuarterlyGoalsForAnnualGoal(annualGoal: GoalNode, year: number): ReadonlyArray<GoalNode> {
  const range = getYearRange(year);

  return annualGoal.children
    .filter((child) => child.type === "long_term_goal" && child.periodType === "quarter" && startsWithinYear(child, range))
    .sort((first, second) => (first.periodStart ?? "").localeCompare(second.periodStart ?? ""));
}

// Which calendar quarter a node sits in, from its own periodStart. Returns
// null when the node carries no usable period, so a caller shows it
// separately instead of guessing Q1.
export function getQuarterIndexForNode(node: GoalNode): 1 | 2 | 3 | 4 | null {
  if (!node.periodStart) return null;
  const start = parseLocalDayKey(node.periodStart);
  return (Math.floor(start.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
}

// Which sibling a level should open on.
//
// Ordering alone is the wrong default: a year's first quarter is January,
// so in Q4 the hierarchy would open on a quarter that finished nine months
// ago - and every band below it would read empty while the real work sat
// one click away. Preference order: the period containing today, then the
// first sibling that actually has children, then the first. Never invents a
// selection for an empty list.
export function pickCurrentNode<T extends Pick<GoalNode, "periodStart" | "periodEnd" | "children">>(nodes: ReadonlyArray<T>, referenceDate = new Date()): T | null {
  if (nodes.length === 0) return null;

  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());

  const containingToday = nodes.find((node) => {
    if (!node.periodStart || !node.periodEnd) return false;
    return parseLocalDayKey(node.periodStart) <= today && today <= parseLocalDayKey(node.periodEnd);
  });

  return containingToday ?? nodes.find((node) => node.children.length > 0) ?? nodes[0];
}

export function yearPeriodKeys(year: number): Readonly<{ periodStart: string; periodEnd: string }> {
  const range = getYearRange(year);
  return { periodStart: getLocalDayKey(range.start), periodEnd: getLocalDayKey(range.end) };
}
