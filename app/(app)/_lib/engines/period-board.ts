import { getLocalDayKey, parseLocalDayKey } from "../local-day";
import { getQuarterRange, type QuarterRange } from "./planning-engine";
import { getYearRange } from "./year-planning";
import type { GoalNode, GoalNodePeriodType, GoalTree } from "../types/goal-tree";

// The period board: the same Goal Tree, read as columns of time instead of
// a parent/child chain.
//
// Nothing new is stored. A column is pure calendar maths, and a node
// belongs to it when its existing periodStart falls inside that column's
// range - the containment rule planning-engine already uses. The Day
// column holds Quests, because a day-level objective in Atlas IS a Quest
// (see the hierarchy view): adding a day-level GoalNode would be a second
// task system alongside the one that already has XP, streaks and mastery.

export type BoardScope = "current" | "day" | "week" | "month" | "quarter" | "year";

export const BOARD_SCOPES: ReadonlyArray<Readonly<{ id: BoardScope; label: string }>> = [
  { id: "current", label: "Current" },
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "quarter", label: "Quarter" },
  { id: "year", label: "Year" },
];

// "day" is deliberately not a GoalNodePeriodType - it maps to Quests.
export type BoardPeriodType = GoalNodePeriodType | "day";

export type BoardColumn = Readonly<{
  id: string;
  periodType: BoardPeriodType;
  title: string;
  subtitle: string;
  startKey: string;
  endKey: string;
  isCurrent: boolean;
}>;

// Which GoalNodeType lives at each level. Mirrors the mapping documented on
// GoalNodePeriodType - this module never invents a second one.
export const PERIOD_NODE_TYPE: Readonly<Record<GoalNodePeriodType, GoalNode["type"]>> = {
  year: "dream",
  quarter: "long_term_goal",
  month: "milestone",
  week: "progress_goal",
};

function startOfWeekMonday(date: Date): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() - ((next.getDay() + 6) % 7));
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

// ISO-8601 week number: weeks start Monday, and week 1 is the one holding
// the first Thursday. Matches what calendars and planners display, rather
// than a naive "day-of-year / 7".
export function getIsoWeekNumber(date: Date): number {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // Shift to the Thursday of this week, then count weeks from Jan 1.
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 86400000));
}

function shortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function weekColumn(weekStart: Date, today: Date, titleOverride?: string): BoardColumn {
  const weekEnd = addDays(weekStart, 6);
  const todayWeekStart = startOfWeekMonday(today);

  return {
    id: `week-${getLocalDayKey(weekStart)}`,
    periodType: "week",
    title: titleOverride ?? `Week ${getIsoWeekNumber(weekStart)}`,
    subtitle: `${shortDate(weekStart)} – ${shortDate(weekEnd)}`,
    startKey: getLocalDayKey(weekStart),
    endKey: getLocalDayKey(weekEnd),
    isCurrent: getLocalDayKey(weekStart) === getLocalDayKey(todayWeekStart),
  };
}

function monthColumn(year: number, month: number, today: Date, titleOverride?: string): BoardColumn {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  return {
    id: `month-${year}-${month + 1}`,
    periodType: "month",
    title: titleOverride ?? start.toLocaleDateString(undefined, { month: "long" }),
    subtitle: `${start.toLocaleDateString(undefined, { month: "long" })} ${year}`.toUpperCase(),
    startKey: getLocalDayKey(start),
    endKey: getLocalDayKey(end),
    isCurrent: today.getFullYear() === year && today.getMonth() === month,
  };
}

function quarterColumn(range: QuarterRange, today: Date, titleOverride?: string): BoardColumn {
  return {
    id: `quarter-${range.year}-Q${range.quarterIndex}`,
    periodType: "quarter",
    title: titleOverride ?? `Q${range.quarterIndex}`,
    subtitle: range.label,
    startKey: getLocalDayKey(range.start),
    endKey: getLocalDayKey(range.end),
    isCurrent: today >= range.start && today <= range.end,
  };
}

function yearColumn(year: number, today: Date, titleOverride?: string): BoardColumn {
  const range = getYearRange(year);

  return {
    id: `year-${year}`,
    periodType: "year",
    title: titleOverride ?? String(year),
    subtitle: String(year),
    startKey: getLocalDayKey(range.start),
    endKey: getLocalDayKey(range.end),
    isCurrent: today.getFullYear() === year,
  };
}

function dayColumn(date: Date, today: Date, titleOverride?: string): BoardColumn {
  const key = getLocalDayKey(date);

  return {
    id: `day-${key}`,
    periodType: "day",
    title: titleOverride ?? date.toLocaleDateString(undefined, { weekday: "long" }),
    subtitle: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    startKey: key,
    endKey: key,
    isCurrent: key === getLocalDayKey(today),
  };
}

// The columns for a scope. "current" is the overview - one column per
// horizon, today outward - and every other scope walks one horizon across
// the selected year.
export function buildBoardColumns(scope: BoardScope, year: number, today: Date = new Date()): BoardColumn[] {
  if (scope === "current") {
    return [
      dayColumn(today, today, "Today"),
      weekColumn(startOfWeekMonday(today), today, "This Week"),
      monthColumn(today.getFullYear(), today.getMonth(), today, "This Month"),
      quarterColumn(getQuarterRange({ year: today.getFullYear(), quarterIndex: (Math.floor(today.getMonth() / 3) + 1) as 1 | 2 | 3 | 4 }), today, "This Quarter"),
      yearColumn(today.getFullYear(), today, "This Year"),
    ];
  }

  if (scope === "day") {
    // Every day of the selected year, so the day scope pages the same way
    // the others do - the board renders only the handful around today,
    // never the whole list, and the window can walk off either end of the
    // current week instead of stopping at Sunday.
    const columns: BoardColumn[] = [];
    const cursor = new Date(year, 0, 1);

    while (cursor.getFullYear() === year) {
      columns.push(dayColumn(new Date(cursor), today));
      cursor.setDate(cursor.getDate() + 1);
    }

    return columns;
  }

  if (scope === "week") {
    const columns: BoardColumn[] = [];
    // Start from the Monday of the week containing Jan 4 - ISO week 1 by
    // definition - and stop once the week has left the year.
    let cursor = startOfWeekMonday(new Date(year, 0, 4));

    while (cursor.getFullYear() <= year && columns.length < 53) {
      columns.push(weekColumn(cursor, today));
      cursor = addDays(cursor, 7);
      if (cursor.getFullYear() > year) break;
    }

    return columns;
  }

  if (scope === "month") {
    return Array.from({ length: 12 }, (_, month) => monthColumn(year, month, today));
  }

  if (scope === "quarter") {
    return ([1, 2, 3, 4] as const).map((quarterIndex) => quarterColumn(getQuarterRange({ year, quarterIndex }), today));
  }

  return [year - 1, year, year + 1, year + 2].map((entry) => yearColumn(entry, today));
}

// Dragging an objective from one column to another. A move only ever
// retimes something - it never converts it - so the plan is computed here
// and refused in full rather than half-applied by the UI.
export type BoardMovePlan =
  | Readonly<{ ok: true; periodStart: string; periodEnd: string; parentId: string | null }>
  | Readonly<{ ok: false; reason: string }>;

export type QuestMovePlan = Readonly<{ ok: true; scheduledDate: string }> | Readonly<{ ok: false; reason: string }>;

const PERIOD_LABEL: Readonly<Record<BoardPeriodType, string>> = {
  day: "daily",
  week: "weekly",
  month: "monthly",
  quarter: "quarterly",
  year: "annual",
};

// Where a GoalNode would land if dropped on this column.
//
// Levels are not interchangeable: a weekly progress_goal and a monthly
// milestone are different types with different required fields, so a drag
// across levels is refused rather than silently rewriting the node. Within
// a level the period moves, and the node re-parents to whatever covers its
// new period - the hierarchy is strict, so a month goal dragged out from
// under its quarter would otherwise be orphaned.
export function planNodeMove(goalTree: GoalTree, node: GoalNode, column: BoardColumn): BoardMovePlan {
  if (column.periodType === "day") {
    return { ok: false, reason: "A day holds Quests, not goals." };
  }

  if (node.periodType !== column.periodType) {
    return { ok: false, reason: `A ${PERIOD_LABEL[node.periodType ?? "week"]} goal cannot become ${PERIOD_LABEL[column.periodType]} by dragging.` };
  }

  if (node.periodStart === column.startKey) {
    return { ok: false, reason: "Already in this period." };
  }

  // A year goal is a root: it has no level above it to hang from.
  if (column.periodType === "year") {
    return { ok: true, periodStart: column.startKey, periodEnd: column.endKey, parentId: null };
  }

  const candidates = findParentCandidates(goalTree, column);

  if (candidates.length === 0) {
    const needed = column.periodType === "quarter" ? "an annual goal" : column.periodType === "month" ? "a quarterly goal" : "a monthly goal";
    return { ok: false, reason: `Create ${needed} covering ${column.title} first — every objective hangs off the level above it.` };
  }

  // Keep the current parent when it still covers the new period, so a move
  // inside one month does not silently re-hang the goal elsewhere.
  const unchanged = candidates.find((candidate) => candidate.id === node.parentId);

  return { ok: true, periodStart: column.startKey, periodEnd: column.endKey, parentId: (unchanged ?? candidates[0]).id };
}

// Where a Quest would land. Only a one-time Quest can be retimed: a
// recurring one has no per-occurrence exception to record, so moving it
// would silently shift every occurrence - the same rule the Calendar
// already applies to its drag-move.
export function planQuestMove(quest: Readonly<{ scheduledDate?: string | null; scheduledDays?: ReadonlyArray<number> }>, column: BoardColumn): QuestMovePlan {
  if (column.periodType !== "day") {
    return { ok: false, reason: "A Quest is a day-level objective." };
  }

  if (!quest.scheduledDate && (quest.scheduledDays?.length ?? 0) > 0) {
    return { ok: false, reason: "This Quest repeats — change its schedule instead of moving one day." };
  }

  if (quest.scheduledDate === column.startKey) {
    return { ok: false, reason: "Already on this day." };
  }

  return { ok: true, scheduledDate: column.startKey };
}

function flattenGoalTree(nodes: GoalTree): GoalNode[] {
  return nodes.flatMap((node) => [node, ...flattenGoalTree(node.children)]);
}

// Nodes that belong to a column: right level, and periodStart inside the
// range. Re-parsed with parseLocalDayKey for the reason planning-engine
// documents - new Date("2026-01-01") is UTC midnight and lands in the wrong
// period for any timezone behind UTC.
export function selectNodesForColumn(goalTree: GoalTree, column: BoardColumn): GoalNode[] {
  if (column.periodType === "day") return [];

  const start = parseLocalDayKey(column.startKey);
  const end = parseLocalDayKey(column.endKey);
  const expectedType = PERIOD_NODE_TYPE[column.periodType];

  return flattenGoalTree(goalTree)
    .filter((node) => node.type === expectedType && node.periodType === column.periodType && node.periodStart)
    .filter((node) => {
      const nodeStart = parseLocalDayKey(node.periodStart as string);
      return nodeStart >= start && nodeStart <= end;
    })
    .sort((first, second) => (first.periodStart ?? "").localeCompare(second.periodStart ?? ""));
}

export type ColumnStats = Readonly<{ total: number; completed: number; progress: number }>;

// Counts only - never a time estimate. Atlas stores no planned or spent
// hours per goal, so a board showing "0h / 0h" would be inventing a field.
export function getColumnStats(nodes: ReadonlyArray<GoalNode>): ColumnStats {
  const total = nodes.length;
  const completed = nodes.filter((node) => node.status === "completed" || node.progress >= 100).length;
  const progress = total === 0 ? 0 : Math.round(nodes.reduce((sum, node) => sum + Math.min(100, Math.max(0, node.progress)), 0) / total);

  return { total, completed, progress };
}

// The parent a new node in this column would attach to. The hierarchy is
// strict (a week lives under a month, a month under a quarter, a quarter
// under a year), so a column can only offer "add" when a containing parent
// exists - returning the candidates rather than picking one, so the UI can
// ask when there are several and explain when there are none.
export function findParentCandidates(goalTree: GoalTree, column: BoardColumn): GoalNode[] {
  if (column.periodType === "year" || column.periodType === "day") return [];

  const parentPeriod: GoalNodePeriodType = column.periodType === "quarter" ? "year" : column.periodType === "month" ? "quarter" : "month";
  const parentType = PERIOD_NODE_TYPE[parentPeriod];
  const columnStart = parseLocalDayKey(column.startKey);

  return flattenGoalTree(goalTree).filter((node) => {
    if (node.type !== parentType || node.periodType !== parentPeriod || !node.periodStart || !node.periodEnd) return false;
    return parseLocalDayKey(node.periodStart) <= columnStart && columnStart <= parseLocalDayKey(node.periodEnd);
  });
}
