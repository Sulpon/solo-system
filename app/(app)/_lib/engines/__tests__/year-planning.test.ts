import { describe, expect, it } from "vitest";
import {
  findAnnualGoalsForYear,
  getCurrentYear,
  getQuarterIndexForNode,
  getQuarterlyGoalsForAnnualGoal,
  getQuartersInYear,
  getUndatedDreams,
  getYearRange,
  getYearsWithGoals,
  isAnnualGoal,
  pickCurrentNode,
  yearPeriodKeys,
} from "../year-planning";
import type { GoalNode } from "../../types/goal-tree";

function node(overrides: Partial<GoalNode> & Pick<GoalNode, "id" | "title" | "type">): GoalNode {
  return {
    description: undefined,
    children: [],
    status: "not_started",
    progress: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function annualGoal(id: string, year: number, children: GoalNode[] = []): GoalNode {
  const period = yearPeriodKeys(year);
  return node({ id, title: `Year ${year}`, type: "dream", periodType: "year", periodStart: period.periodStart, periodEnd: period.periodEnd, children });
}

function quarterlyGoal(id: string, periodStart: string, parentId: string): GoalNode {
  return node({ id, title: `Quarterly ${id}`, type: "long_term_goal", periodType: "quarter", periodStart, parentId });
}

describe("getYearRange", () => {
  it("spans the whole calendar year in local time", () => {
    const range = getYearRange(2026);

    expect(range.start.getFullYear()).toBe(2026);
    expect(range.start.getMonth()).toBe(0);
    expect(range.start.getDate()).toBe(1);
    expect(range.end.getMonth()).toBe(11);
    expect(range.end.getDate()).toBe(31);
    expect(range.label).toBe("2026");
  });

  it("produces date-only keys that round-trip back into the same year", () => {
    const keys = yearPeriodKeys(2026);

    expect(keys.periodStart).toBe("2026-01-01");
    expect(keys.periodEnd).toBe("2026-12-31");
  });
});

describe("getQuartersInYear", () => {
  it("returns the four quarters in order", () => {
    expect(getQuartersInYear(2026).map((quarter) => quarter.label)).toEqual(["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026"]);
  });
});

describe("isAnnualGoal", () => {
  it("recognises a dated dream", () => {
    expect(isAnnualGoal(annualGoal("y1", 2026))).toBe(true);
  });

  it("does not treat an undated dream as an annual goal", () => {
    expect(isAnnualGoal(node({ id: "d1", title: "Someday", type: "dream" }))).toBe(false);
  });

  it("does not treat a quarterly goal as an annual goal", () => {
    expect(isAnnualGoal(quarterlyGoal("q1", "2026-01-01", "y1"))).toBe(false);
  });
});

describe("findAnnualGoalsForYear", () => {
  it("returns only the goals belonging to the requested year", () => {
    const tree = [annualGoal("y2026", 2026), annualGoal("y2027", 2027)];

    expect(findAnnualGoalsForYear(tree, 2026).map((item) => item.id)).toEqual(["y2026"]);
    expect(findAnnualGoalsForYear(tree, 2027).map((item) => item.id)).toEqual(["y2027"]);
  });

  it("returns nothing for a year with no goals, rather than falling back to another year", () => {
    expect(findAnnualGoalsForYear([annualGoal("y2026", 2026)], 2030)).toHaveLength(0);
  });

  it("never picks up an undated dream", () => {
    expect(findAnnualGoalsForYear([node({ id: "d1", title: "Someday", type: "dream" })], 2026)).toHaveLength(0);
  });

  it("puts a goal starting on the first day of the year inside that year, not the previous one", () => {
    // Guards the UTC-parsing bug planning-engine documents: new Date("2026-01-01")
    // is UTC midnight, which is 2025 for any timezone behind UTC.
    const goal = node({ id: "y", title: "Edge", type: "dream", periodType: "year", periodStart: "2026-01-01", periodEnd: "2026-12-31" });

    expect(findAnnualGoalsForYear([goal], 2026).map((item) => item.id)).toEqual(["y"]);
    expect(findAnnualGoalsForYear([goal], 2025)).toHaveLength(0);
  });

  it("puts a goal starting on the last day of the year inside that year", () => {
    const goal = node({ id: "y", title: "Edge", type: "dream", periodType: "year", periodStart: "2026-12-31" });

    expect(findAnnualGoalsForYear([goal], 2026).map((item) => item.id)).toEqual(["y"]);
    expect(findAnnualGoalsForYear([goal], 2027)).toHaveLength(0);
  });
});

describe("getUndatedDreams", () => {
  it("keeps dreams that predate the Year level reachable", () => {
    const tree = [annualGoal("y2026", 2026), node({ id: "d1", title: "Ongoing direction", type: "dream" })];

    expect(getUndatedDreams(tree).map((item) => item.id)).toEqual(["d1"]);
  });
});

describe("getYearsWithGoals", () => {
  it("always offers the current year even with an empty tree", () => {
    const reference = new Date(2026, 5, 15);

    expect(getYearsWithGoals([], reference)).toEqual([2026]);
  });

  it("includes every year that has a goal, ascending, without duplicates", () => {
    const reference = new Date(2026, 5, 15);
    const tree = [annualGoal("a", 2027), annualGoal("b", 2025), annualGoal("c", 2027)];

    expect(getYearsWithGoals(tree, reference)).toEqual([2025, 2026, 2027]);
  });
});

describe("getQuarterlyGoalsForAnnualGoal", () => {
  it("returns the annual goal's own quarterly children in calendar order", () => {
    const year = annualGoal("y", 2026, [quarterlyGoal("q3", "2026-07-01", "y"), quarterlyGoal("q1", "2026-01-01", "y")]);

    expect(getQuarterlyGoalsForAnnualGoal(year, 2026).map((item) => item.id)).toEqual(["q1", "q3"]);
  });

  it("excludes a child that belongs to a different year", () => {
    const year = annualGoal("y", 2026, [quarterlyGoal("q1", "2026-01-01", "y"), quarterlyGoal("stale", "2025-01-01", "y")]);

    expect(getQuarterlyGoalsForAnnualGoal(year, 2026).map((item) => item.id)).toEqual(["q1"]);
  });

  it("ignores children that are not quarterly goals", () => {
    const year = annualGoal("y", 2026, [node({ id: "m", title: "Stray monthly", type: "milestone", periodType: "month", periodStart: "2026-02-01", parentId: "y" })]);

    expect(getQuarterlyGoalsForAnnualGoal(year, 2026)).toHaveLength(0);
  });
});

describe("getQuarterIndexForNode", () => {
  it("maps a period start onto its calendar quarter", () => {
    expect(getQuarterIndexForNode(quarterlyGoal("q", "2026-02-10", "y"))).toBe(1);
    expect(getQuarterIndexForNode(quarterlyGoal("q", "2026-04-01", "y"))).toBe(2);
    expect(getQuarterIndexForNode(quarterlyGoal("q", "2026-12-31", "y"))).toBe(4);
  });

  it("returns null rather than guessing when there is no period", () => {
    expect(getQuarterIndexForNode(node({ id: "x", title: "No period", type: "long_term_goal" }))).toBeNull();
  });
});

describe("getCurrentYear", () => {
  it("reads the year from the reference date", () => {
    expect(getCurrentYear(new Date(2029, 0, 2))).toBe(2029);
  });
});

describe("pickCurrentNode", () => {
  const ref = new Date(2026, 9, 15); // 15 Oct 2026

  it("returns null for an empty list rather than inventing a selection", () => {
    expect(pickCurrentNode([], ref)).toBeNull();
  });

  it("prefers the period that contains today over the earliest one", () => {
    const q1 = quarterlyGoal("q1", "2026-01-01", "y");
    const q4 = node({ id: "q4", title: "Q4", type: "long_term_goal", periodType: "quarter", periodStart: "2026-10-01", periodEnd: "2026-12-31", parentId: "y" });

    expect(pickCurrentNode([{ ...q1, periodEnd: "2026-03-31" }, q4], ref)?.id).toBe("q4");
  });

  it("includes the first and last day of a period", () => {
    const period = node({ id: "p", title: "P", type: "milestone", periodStart: "2026-10-15", periodEnd: "2026-10-15" });

    expect(pickCurrentNode([period], ref)?.id).toBe("p");
  });

  it("falls back to the first sibling that has children when nothing contains today", () => {
    const empty = node({ id: "empty", title: "Empty", type: "milestone", periodStart: "2026-01-01", periodEnd: "2026-01-31" });
    const populated = node({ id: "populated", title: "Populated", type: "milestone", periodStart: "2026-02-01", periodEnd: "2026-02-28", children: [node({ id: "c", title: "C", type: "progress_goal" })] });

    expect(pickCurrentNode([empty, populated], ref)?.id).toBe("populated");
  });

  it("falls back to the first sibling when none contain today and none have children", () => {
    const first = node({ id: "first", title: "First", type: "milestone", periodStart: "2026-01-01", periodEnd: "2026-01-31" });
    const second = node({ id: "second", title: "Second", type: "milestone", periodStart: "2026-02-01", periodEnd: "2026-02-28" });

    expect(pickCurrentNode([first, second], ref)?.id).toBe("first");
  });

  it("ignores nodes with no period when looking for today", () => {
    const undated = node({ id: "undated", title: "Undated", type: "milestone" });
    const current = node({ id: "current", title: "Current", type: "milestone", periodStart: "2026-10-01", periodEnd: "2026-10-31" });

    expect(pickCurrentNode([undated, current], ref)?.id).toBe("current");
  });
});
