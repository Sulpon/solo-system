import { getAncestorChain } from "../goal-tree-storage";
import { getLocalDayKey, parseLocalDayKey } from "../local-day";
import type { GoalNode, GoalTree } from "../types/goal-tree";
import type { Quest } from "../types/quest";

// Planning is a time-boxed lens over the existing GoalNode tree (see
// GoalNodePeriodType in types/goal-tree.ts) - every function here only
// reads/derives from that same tree, never a second data source. A
// "quarter" is never stored as its own entity; it's just a date range
// computed from calendar math.

export type QuarterRef = Readonly<{ year: number; quarterIndex: 1 | 2 | 3 | 4 }>;
export type QuarterRange = QuarterRef & Readonly<{ start: Date; end: Date; label: string }>;

export function getQuarterForDate(date: Date): QuarterRef {
  const quarterIndex = (Math.floor(date.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
  return { year: date.getFullYear(), quarterIndex };
}

export function getQuarterRange(ref: QuarterRef): QuarterRange {
  const startMonth = (ref.quarterIndex - 1) * 3;
  const start = new Date(ref.year, startMonth, 1);
  const end = new Date(ref.year, startMonth + 3, 0); // last day of the quarter's final month
  const label = `Q${ref.quarterIndex} ${ref.year}`;
  return { ...ref, start, end, label };
}

export function shiftQuarter(ref: QuarterRef, delta: number): QuarterRef {
  const absoluteIndex = ref.year * 4 + (ref.quarterIndex - 1) + delta;
  const year = Math.floor(absoluteIndex / 4);
  const quarterIndex = (((absoluteIndex % 4) + 4) % 4) + 1;
  return { year, quarterIndex: quarterIndex as 1 | 2 | 3 | 4 };
}

export function formatDateRange(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: sameYear ? undefined : "numeric" });
  const endLabel = end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

export type MonthRef = Readonly<{ year: number; month: number; label: string; start: Date; end: Date }>;

export function getMonthsInQuarter(ref: QuarterRef): MonthRef[] {
  const startMonth = (ref.quarterIndex - 1) * 3;
  return [0, 1, 2].map((offset) => {
    const month = startMonth + offset;
    const start = new Date(ref.year, month, 1);
    const end = new Date(ref.year, month + 1, 0);
    return { year: ref.year, month, label: start.toLocaleDateString(undefined, { month: "long" }), start, end };
  });
}

// A node "belongs to" a period if its periodStart falls within that
// period's date range - a node is only ever created for one period, so
// start-containment is enough (no overlap logic needed).
//
// periodStart/End are stored as date-only strings (via getLocalDayKey), so
// they must be re-parsed with parseLocalDayKey (local components), not the
// bare Date constructor - `new Date("2026-07-01")` parses as UTC midnight,
// which silently falls on the wrong side of a locally-constructed quarter
// boundary for any timezone not exactly UTC+0.
function startsWithin(node: GoalNode, start: Date, end: Date): boolean {
  if (!node.periodStart) {
    return false;
  }
  const nodeStart = parseLocalDayKey(node.periodStart);
  return nodeStart >= start && nodeStart <= end;
}

export function findQuarterlyGoalsForQuarter(goalTree: GoalTree, quarter: QuarterRange): ReadonlyArray<GoalNode> {
  const results: GoalNode[] = [];

  function walk(nodes: GoalTree) {
    for (const node of nodes) {
      if (node.type === "long_term_goal" && node.periodType === "quarter" && startsWithin(node, quarter.start, quarter.end)) {
        results.push(node);
      }
      walk(node.children);
    }
  }

  walk(goalTree);
  return results;
}

export function getDreamsWithGoalsInQuarter(goalTree: GoalTree, quarter: QuarterRange): ReadonlyArray<{ dream: GoalNode; quarterlyGoals: GoalNode[] }> {
  const dreams = goalTree.filter((node) => node.type === "dream");
  const quarterlyGoals = findQuarterlyGoalsForQuarter(goalTree, quarter);

  return dreams
    .map((dream) => ({ dream, quarterlyGoals: quarterlyGoals.filter((goal) => goal.parentId === dream.id) }))
    .filter((entry) => entry.quarterlyGoals.length > 0);
}

export function getMonthlyMilestones(quarterlyGoal: GoalNode): ReadonlyArray<GoalNode> {
  return quarterlyGoal.children.filter((node) => node.type === "milestone" && node.periodType === "month").sort((a, b) => (a.periodStart ?? "").localeCompare(b.periodStart ?? ""));
}

export function getWeeklyMilestones(monthlyMilestone: GoalNode): ReadonlyArray<GoalNode> {
  return monthlyMilestone.children.filter((node) => node.type === "progress_goal" && node.periodType === "week").sort((a, b) => (a.periodStart ?? "").localeCompare(b.periodStart ?? ""));
}

export function getQuestsForWeeklyMilestone(weeklyMilestone: GoalNode, quests: ReadonlyArray<Quest>): ReadonlyArray<Quest> {
  return quests.filter((quest) => quest.linkedProgressGoalId === weeklyMilestone.id);
}

// Quest -> Weekly -> Monthly -> Quarterly -> Dream, fully derived from the
// existing ancestor-chain walk - nothing about this lineage is stored
// redundantly anywhere.
export function getAncestorChainForQuest(goalTree: GoalTree, quest: Pick<Quest, "linkedProgressGoalId">): ReadonlyArray<GoalNode> | null {
  if (!quest.linkedProgressGoalId) {
    return null;
  }
  return getAncestorChain(goalTree, quest.linkedProgressGoalId);
}

export function defaultWeekRange(referenceDate = new Date()): { start: string; end: string } {
  const start = new Date(referenceDate);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Monday of this week
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: getLocalDayKey(start), end: getLocalDayKey(end) };
}
