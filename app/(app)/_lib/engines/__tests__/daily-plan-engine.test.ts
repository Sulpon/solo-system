import { describe, expect, it } from "vitest";
import { formatMinutes, getBlockMinutes, getUpcomingDeadlines, parseTimeToMinutes, summariseDay } from "../daily-plan-engine";
import type { CalendarQuestItem } from "../quest-calendar-engine";
import type { GoalNode, GoalTree } from "../../types/goal-tree";

const TODAY = new Date(2026, 9, 10);

function item(overrides: Partial<CalendarQuestItem> = {}): CalendarQuestItem {
  return {
    quest: { id: "q", title: "Q" } as CalendarQuestItem["quest"],
    status: "scheduled",
    completion: undefined,
    startTime: null,
    endTime: null,
    isRecurring: false,
    ...overrides,
  } as CalendarQuestItem;
}

function node(id: string, overrides: Partial<GoalNode> = {}): GoalNode {
  return { id, title: id, type: "milestone", status: "not_started", progress: 0, children: [], createdAt: "x", updatedAt: "y", ...overrides };
}

describe("parseTimeToMinutes", () => {
  it("reads a normal time", () => {
    expect(parseTimeToMinutes("09:30")).toBe(570);
    expect(parseTimeToMinutes("9:05")).toBe(545);
  });

  it("rejects nonsense rather than guessing", () => {
    expect(parseTimeToMinutes("25:00")).toBeNull();
    expect(parseTimeToMinutes("09:70")).toBeNull();
    expect(parseTimeToMinutes("soon")).toBeNull();
    expect(parseTimeToMinutes(null)).toBeNull();
    expect(parseTimeToMinutes(undefined)).toBeNull();
  });
});

describe("getBlockMinutes", () => {
  it("measures a block with both ends", () => {
    expect(getBlockMinutes({ startTime: "09:00", endTime: "14:00" })).toBe(300);
  });

  it("refuses to guess a duration from a start time alone", () => {
    expect(getBlockMinutes({ startTime: "09:00", endTime: null })).toBeNull();
  });

  it("refuses a backwards or zero-length block", () => {
    expect(getBlockMinutes({ startTime: "14:00", endTime: "09:00" })).toBeNull();
    expect(getBlockMinutes({ startTime: "09:00", endTime: "09:00" })).toBeNull();
  });
});

describe("summariseDay", () => {
  it("counts completions and only the minutes that are really scheduled", () => {
    const summary = summariseDay([
      item({ status: "completed", startTime: "09:00", endTime: "10:00" }),
      item({ status: "scheduled", startTime: "10:00", endTime: "11:30" }),
      item({ status: "scheduled" }),
    ]);

    expect(summary).toEqual({ total: 3, completed: 1, remaining: 2, plannedMinutes: 150, completedMinutes: 60, untimedCount: 1 });
  });

  it("reports an empty day honestly rather than as zero progress out of something", () => {
    expect(summariseDay([])).toEqual({ total: 0, completed: 0, remaining: 0, plannedMinutes: 0, completedMinutes: 0, untimedCount: 0 });
  });

  it("counts an all-day item as untimed, never as an invented duration", () => {
    expect(summariseDay([item({ status: "completed" })])).toMatchObject({ completed: 1, plannedMinutes: 0, completedMinutes: 0, untimedCount: 1 });
  });
});

describe("formatMinutes", () => {
  it("formats hours and minutes", () => {
    expect(formatMinutes(0)).toBe("0m");
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(150)).toBe("2h 30m");
  });
});

describe("getUpcomingDeadlines", () => {
  const tree: GoalTree = [
    node("soon", { periodEnd: "2026-10-12" }),
    node("overdue", { periodEnd: "2026-10-05" }),
    node("far", { periodEnd: "2026-12-01" }),
    node("done", { periodEnd: "2026-10-11", status: "completed" }),
    node("undated"),
    node("parent", { periodEnd: "2026-10-20", children: [node("nested", { periodEnd: "2026-10-11" })] }),
  ];

  it("returns only unfinished goals with a real end date, soonest first", () => {
    const due = getUpcomingDeadlines(tree, TODAY, 14);

    expect(due.map((entry) => entry.node.id)).toEqual(["overdue", "nested", "soon", "parent"]);
  });

  it("marks what has already slipped", () => {
    const [first] = getUpcomingDeadlines(tree, TODAY, 14);

    expect(first.isOverdue).toBe(true);
    expect(first.daysLeft).toBe(-5);
  });

  it("leaves out a finished goal even though its period ends tomorrow", () => {
    expect(getUpcomingDeadlines(tree, TODAY, 14).some((entry) => entry.node.id === "done")).toBe(false);
  });

  it("leaves out goals with no end date at all", () => {
    expect(getUpcomingDeadlines(tree, TODAY, 14).some((entry) => entry.node.id === "undated")).toBe(false);
  });

  it("respects the window", () => {
    expect(getUpcomingDeadlines(tree, TODAY, 3).map((entry) => entry.node.id)).toEqual(["overdue", "nested", "soon"]);
  });

  it("survives a legacy node with no children array", () => {
    const legacy = [{ id: "a", title: "A", type: "dream", status: "not_started", progress: 0, periodEnd: "2026-10-11", createdAt: "x", updatedAt: "y" }] as unknown as GoalTree;

    expect(() => getUpcomingDeadlines(legacy, TODAY)).not.toThrow();
  });
});
