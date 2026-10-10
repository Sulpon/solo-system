import { describe, expect, it } from "vitest";
import { buildBoardColumns, findParentCandidates, getColumnStats, getIsoWeekNumber, planNodeMove, planQuestMove, selectNodesForColumn } from "../period-board";
import type { GoalNode, GoalNodePeriodType, GoalTree } from "../../types/goal-tree";

const TODAY = new Date(2026, 9, 9); // Fri 9 Oct 2026 - ISO week 41, Q4

function node(overrides: Partial<GoalNode> & Pick<GoalNode, "id" | "type">): GoalNode {
  return { title: overrides.id, children: [], status: "not_started", progress: 0, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", ...overrides };
}

function periodNode(id: string, periodType: GoalNodePeriodType, start: string, end: string, extra: Partial<GoalNode> = {}): GoalNode {
  const type = periodType === "year" ? "dream" : periodType === "quarter" ? "long_term_goal" : periodType === "month" ? "milestone" : "progress_goal";
  return node({ id, type, periodType, periodStart: start, periodEnd: end, ...extra });
}

describe("getIsoWeekNumber", () => {
  it("matches ISO-8601 week numbering", () => {
    expect(getIsoWeekNumber(new Date(2026, 9, 9))).toBe(41);
    // 1 Jan 2026 is a Thursday, so it is in week 1.
    expect(getIsoWeekNumber(new Date(2026, 0, 1))).toBe(1);
  });

  it("puts early-January days belonging to the previous year's last week in week 52/53", () => {
    // 1 Jan 2027 is a Friday; its Monday is 28 Dec 2026, still week 53.
    expect(getIsoWeekNumber(new Date(2027, 0, 1))).toBeGreaterThan(50);
  });
});

describe("buildBoardColumns", () => {
  it("gives the current scope one column per horizon, today outward", () => {
    const columns = buildBoardColumns("current", 2026, TODAY);

    expect(columns.map((column) => column.title)).toEqual(["Today", "This Week", "This Month", "This Quarter", "This Year"]);
    expect(columns.map((column) => column.periodType)).toEqual(["day", "week", "month", "quarter", "year"]);
    expect(columns.every((column) => column.isCurrent)).toBe(true);
  });

  it("gives one column per day of the year for the day scope", () => {
    const columns = buildBoardColumns("day", 2026, TODAY);

    // 2026 is not a leap year.
    expect(columns).toHaveLength(365);
    expect(columns[0].startKey).toBe("2026-01-01");
    expect(columns[columns.length - 1].startKey).toBe("2026-12-31");
    expect(columns.every((column) => column.periodType === "day")).toBe(true);
    expect(columns.filter((column) => column.isCurrent)).toHaveLength(1);
    expect(columns.findIndex((column) => column.isCurrent)).toBe(281);
  });

  it("covers the extra day of a leap year", () => {
    expect(buildBoardColumns("day", 2028, TODAY)).toHaveLength(366);
  });

  it("walks the weeks of a year and marks the current one", () => {
    const columns = buildBoardColumns("week", 2026, TODAY);

    expect(columns.length).toBeGreaterThanOrEqual(52);
    expect(columns.length).toBeLessThanOrEqual(53);
    expect(columns.filter((column) => column.isCurrent)).toHaveLength(1);
    expect(columns[0].title).toBe("Week 1");
  });

  it("gives twelve month columns, with only the live one current", () => {
    const columns = buildBoardColumns("month", 2026, TODAY);

    expect(columns).toHaveLength(12);
    expect(columns.filter((column) => column.isCurrent).map((column) => column.id)).toEqual(["month-2026-10"]);
  });

  it("gives four quarter columns and marks the live quarter", () => {
    const columns = buildBoardColumns("quarter", 2026, TODAY);

    expect(columns.map((column) => column.title)).toEqual(["Q1", "Q2", "Q3", "Q4"]);
    expect(columns.filter((column) => column.isCurrent).map((column) => column.title)).toEqual(["Q4"]);
  });

  it("marks no column current when looking at another year", () => {
    expect(buildBoardColumns("month", 2030, TODAY).some((column) => column.isCurrent)).toBe(false);
  });

  it("every column carries a real, ordered date range", () => {
    for (const scope of ["current", "day", "week", "month", "quarter", "year"] as const) {
      for (const column of buildBoardColumns(scope, 2026, TODAY)) {
        expect(column.startKey, `${scope}/${column.id}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(column.endKey >= column.startKey, `${scope}/${column.id}`).toBe(true);
      }
    }
  });
});

describe("selectNodesForColumn", () => {
  const tree: GoalTree = [
    periodNode("y", "year", "2026-01-01", "2026-12-31", {
      children: [
        periodNode("q4", "quarter", "2026-10-01", "2026-12-31", {
          children: [periodNode("oct", "month", "2026-10-01", "2026-10-31", { children: [periodNode("w41", "week", "2026-10-05", "2026-10-11")] })],
        }),
        periodNode("q1", "quarter", "2026-01-01", "2026-03-31"),
      ],
    }),
  ];

  it("finds the node at the matching level inside the range, at any tree depth", () => {
    const monthColumn = buildBoardColumns("month", 2026, TODAY).find((column) => column.id === "month-2026-10")!;

    expect(selectNodesForColumn(tree, monthColumn).map((n) => n.id)).toEqual(["oct"]);
  });

  it("does not leak a node from a different level into the column", () => {
    const quarterColumn = buildBoardColumns("quarter", 2026, TODAY).find((column) => column.title === "Q4")!;

    // The month and week also start inside Q4's range, but are not quarters.
    expect(selectNodesForColumn(tree, quarterColumn).map((n) => n.id)).toEqual(["q4"]);
  });

  it("returns nothing for a period with no nodes", () => {
    const march = buildBoardColumns("month", 2026, TODAY).find((column) => column.id === "month-2026-3")!;

    expect(selectNodesForColumn(tree, march)).toEqual([]);
  });

  it("holds no GoalNodes for a day column - those are Quests", () => {
    expect(selectNodesForColumn(tree, buildBoardColumns("day", 2026, TODAY)[0])).toEqual([]);
  });

  it("ignores a node with no period at all", () => {
    const undated: GoalTree = [node({ id: "d", type: "dream" })];
    const yearColumn = buildBoardColumns("year", 2026, TODAY).find((column) => column.title === "2026")!;

    expect(selectNodesForColumn(undated, yearColumn)).toEqual([]);
  });
});

describe("getColumnStats", () => {
  it("counts real completions, never invents hours", () => {
    const stats = getColumnStats([
      periodNode("a", "month", "2026-10-01", "2026-10-31", { progress: 100, status: "completed" }),
      periodNode("b", "month", "2026-10-01", "2026-10-31", { progress: 40 }),
    ]);

    expect(stats).toEqual({ total: 2, completed: 1, progress: 70 });
  });

  it("reports an empty column as genuinely empty", () => {
    expect(getColumnStats([])).toEqual({ total: 0, completed: 0, progress: 0 });
  });

  it("treats 100% progress as complete even without the status flag", () => {
    expect(getColumnStats([periodNode("a", "week", "2026-10-05", "2026-10-11", { progress: 100 })]).completed).toBe(1);
  });
});

describe("findParentCandidates", () => {
  const tree: GoalTree = [
    periodNode("y", "year", "2026-01-01", "2026-12-31", {
      children: [periodNode("q4", "quarter", "2026-10-01", "2026-12-31", { children: [periodNode("oct", "month", "2026-10-01", "2026-10-31")] })],
    }),
  ];

  it("offers the containing year for a quarter column", () => {
    const q4 = buildBoardColumns("quarter", 2026, TODAY).find((column) => column.title === "Q4")!;

    expect(findParentCandidates(tree, q4).map((n) => n.id)).toEqual(["y"]);
  });

  it("offers the containing quarter for a month column", () => {
    const october = buildBoardColumns("month", 2026, TODAY).find((column) => column.id === "month-2026-10")!;

    expect(findParentCandidates(tree, october).map((n) => n.id)).toEqual(["q4"]);
  });

  it("offers the containing month for a week column", () => {
    const week = buildBoardColumns("week", 2026, TODAY).find((column) => column.startKey === "2026-10-05")!;

    expect(findParentCandidates(tree, week).map((n) => n.id)).toEqual(["oct"]);
  });

  it("offers nothing when the containing parent does not exist yet", () => {
    const march = buildBoardColumns("month", 2026, TODAY).find((column) => column.id === "month-2026-3")!;

    expect(findParentCandidates(tree, march)).toEqual([]);
  });

  it("needs no parent for a year column", () => {
    expect(findParentCandidates(tree, buildBoardColumns("year", 2026, TODAY)[0])).toEqual([]);
  });
});

describe("planNodeMove", () => {
  const columns = buildBoardColumns("week", 2026, TODAY);
  const week41 = columns.find((column) => column.isCurrent) as ReturnType<typeof buildBoardColumns>[number];
  const week42 = columns[columns.indexOf(week41) + 1];
  // A quarter -> month -> week chain, so week columns have a real parent.
  const movable: GoalTree = [
    periodNode("y", "year", "2026-01-01", "2026-12-31", {
      children: [
        periodNode("q", "quarter", "2026-10-01", "2026-12-31", {
          children: [
            periodNode("m", "month", "2026-10-01", "2026-10-31", {
              children: [periodNode("w", "week", week41.startKey, week41.endKey, { parentId: "m" })],
            }),
          ],
        }),
      ],
    }),
  ];
  const weekNode = periodNode("w", "week", week41.startKey, week41.endKey, { parentId: "m" });

  it("retimes a goal inside its level and keeps a parent that still covers it", () => {
    const plan = planNodeMove(movable, weekNode, week42);

    expect(plan).toEqual({ ok: true, periodStart: week42.startKey, periodEnd: week42.endKey, parentId: "m" });
  });

  it("refuses a drag across levels rather than rewriting the node's type", () => {
    const monthColumn = buildBoardColumns("month", 2026, TODAY)[9];
    const plan = planNodeMove(movable, weekNode, monthColumn);

    expect(plan.ok).toBe(false);
    expect((plan as { reason: string }).reason).toMatch(/cannot become/);
  });

  it("refuses a day column, which holds Quests", () => {
    expect(planNodeMove(movable, weekNode, buildBoardColumns("day", 2026, TODAY)[0]).ok).toBe(false);
  });

  it("refuses when nothing at the level above covers the target period", () => {
    // Week 2 sits in January; the only month goal is October.
    const plan = planNodeMove(movable, weekNode, columns[1]);

    expect(plan.ok).toBe(false);
    expect((plan as { reason: string }).reason).toMatch(/Create a monthly goal/);
  });

  it("treats a drop on the column it already sits in as no move", () => {
    expect(planNodeMove(movable, weekNode, week41).ok).toBe(false);
  });

  it("moves a year goal without needing a parent", () => {
    const yearColumns = buildBoardColumns("year", 2026, TODAY);
    const yearNode = periodNode("y", "year", "2026-01-01", "2026-12-31");
    const plan = planNodeMove(movable, yearNode, yearColumns[2]);

    expect(plan).toEqual({ ok: true, periodStart: yearColumns[2].startKey, periodEnd: yearColumns[2].endKey, parentId: null });
  });
});

describe("planQuestMove", () => {
  const days = buildBoardColumns("day", 2026, TODAY);
  const today = days.find((column) => column.isCurrent) as ReturnType<typeof buildBoardColumns>[number];
  const tomorrow = days[days.indexOf(today) + 1];

  it("retimes a one-time Quest to the dropped day", () => {
    expect(planQuestMove({ scheduledDate: today.startKey }, tomorrow)).toEqual({ ok: true, scheduledDate: tomorrow.startKey });
  });

  it("schedules a Quest that had no date at all", () => {
    expect(planQuestMove({}, tomorrow)).toEqual({ ok: true, scheduledDate: tomorrow.startKey });
  });

  it("refuses a recurring Quest, which has no per-occurrence exception to record", () => {
    const plan = planQuestMove({ scheduledDays: [1, 3, 5] }, tomorrow);

    expect(plan.ok).toBe(false);
    expect((plan as { reason: string }).reason).toMatch(/repeats/);
  });

  it("refuses a column that is not a day", () => {
    expect(planQuestMove({ scheduledDate: today.startKey }, buildBoardColumns("week", 2026, TODAY)[0]).ok).toBe(false);
  });

  it("treats a drop on the Quest's own day as no move", () => {
    expect(planQuestMove({ scheduledDate: today.startKey }, today).ok).toBe(false);
  });
});
