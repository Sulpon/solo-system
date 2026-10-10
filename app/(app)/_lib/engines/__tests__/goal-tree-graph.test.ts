import { describe, expect, it } from "vitest";
import { collectExpandableIds, collectNodeIds, countBranchStates, findAncestorIds, findNodeInTree, flattenVisibleTree, getBranchState } from "../goal-tree-graph";
import { ensureGoalTreeShape } from "../../goal-tree-storage";
import type { GoalNode, GoalTree } from "../../types/goal-tree";

const TODAY = new Date(2026, 9, 10);

function node(id: string, overrides: Partial<GoalNode> = {}): GoalNode {
  return {
    id,
    title: id,
    type: "milestone",
    status: "not_started",
    progress: 0,
    children: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// year
//  ├ q1
//  │  ├ m1
//  │  └ m2
//  └ q2
const tree: GoalTree = [
  node("year", {
    type: "dream",
    children: [
      node("q1", { type: "long_term_goal", children: [node("m1"), node("m2")] }),
      node("q2", { type: "long_term_goal" }),
    ],
  }),
];

describe("getBranchState", () => {
  it("is completed from the status", () => {
    expect(getBranchState(node("a", { status: "completed" }), TODAY)).toBe("completed");
  });

  it("is completed from a full progress roll-up even when the status lags", () => {
    expect(getBranchState(node("a", { progress: 100 }), TODAY)).toBe("completed");
  });

  it("is at risk once the period has ended with work left", () => {
    expect(getBranchState(node("a", { periodEnd: "2026-10-09", progress: 40 }), TODAY)).toBe("at_risk");
  });

  it("is not at risk on the last day of the period", () => {
    expect(getBranchState(node("a", { periodEnd: "2026-10-10", progress: 40 }), TODAY)).toBe("in_progress");
  });

  it("does not call a finished goal at risk just because its period ended", () => {
    expect(getBranchState(node("a", { periodEnd: "2026-01-01", status: "completed" }), TODAY)).toBe("completed");
  });

  it("is in progress from partial progress alone", () => {
    expect(getBranchState(node("a", { progress: 5 }), TODAY)).toBe("in_progress");
  });

  it("is not started for untouched work with no deadline behind it", () => {
    expect(getBranchState(node("a"), TODAY)).toBe("not_started");
  });
});

describe("flattenVisibleTree", () => {
  it("shows only the roots when nothing is expanded", () => {
    expect(flattenVisibleTree(tree, new Set()).map((row) => row.node.id)).toEqual(["year"]);
  });

  it("walks depth-first, parents before children", () => {
    const rows = flattenVisibleTree(tree, new Set(["year", "q1"]));

    expect(rows.map((row) => row.node.id)).toEqual(["year", "q1", "m1", "m2", "q2"]);
    expect(rows.map((row) => row.depth)).toEqual([0, 1, 2, 2, 1]);
  });

  it("hides a collapsed subtree without hiding later siblings", () => {
    expect(flattenVisibleTree(tree, new Set(["year"])).map((row) => row.node.id)).toEqual(["year", "q1", "q2"]);
  });

  it("reports the child count even while collapsed, so the chevron knows", () => {
    const [root] = flattenVisibleTree(tree, new Set());

    expect(root.childCount).toBe(2);
    expect(root.isExpanded).toBe(false);
  });

  it("continues a rail past a node that still has a sibling below it", () => {
    const rows = flattenVisibleTree(tree, new Set(["year", "q1"]));
    const byId = Object.fromEntries(rows.map((row) => [row.node.id, row]));

    // One flag per ancestor: year at depth 0, q1 at depth 1. year has no
    // sibling, so no rail there; q1 has q2 below it, so that rail runs on
    // down the left of m1 and m2.
    expect(byId.m1.ancestorRails).toEqual([false, true]);
    expect(byId.m2.ancestorRails).toEqual([false, true]);
    // q2 is the last child of year, so nothing continues past it.
    expect(byId.q2.isLastChild).toBe(true);
    expect(byId.q1.isLastChild).toBe(false);
  });

  it("stops the rail under a last child", () => {
    const deep: GoalTree = [node("a", { children: [node("b", { children: [node("c")] })] })];
    const rows = flattenVisibleTree(deep, new Set(["a", "b"]));

    // Neither a nor b has a sibling, so no rail runs beside c at all.
    expect(rows[2].ancestorRails).toEqual([false, false]);
  });

  it("returns nothing for an empty tree", () => {
    expect(flattenVisibleTree([], new Set())).toEqual([]);
  });
});

describe("tree lookups", () => {
  it("collects every id", () => {
    expect(collectNodeIds(tree).sort()).toEqual(["m1", "m2", "q1", "q2", "year"]);
  });

  it("collects only the ids that can be expanded", () => {
    expect(collectExpandableIds(tree).sort()).toEqual(["q1", "year"]);
  });

  it("finds the ancestors of a buried node, outermost first", () => {
    expect(findAncestorIds(tree, "m2")).toEqual(["year", "q1"]);
  });

  it("returns no ancestors for a root and for a stranger", () => {
    expect(findAncestorIds(tree, "year")).toEqual([]);
    expect(findAncestorIds(tree, "nope")).toEqual([]);
  });

  it("finds a node at any depth and null for a stranger", () => {
    expect(findNodeInTree(tree, "m1")?.id).toBe("m1");
    expect(findNodeInTree(tree, "nope")).toBeNull();
  });
});

describe("countBranchStates", () => {
  it("counts every node in the tree, not just the roots", () => {
    const counts = countBranchStates(
      [node("a", { progress: 100, children: [node("b", { progress: 20 }), node("c", { periodEnd: "2026-01-01" })] })],
      TODAY,
    );

    expect(counts).toEqual({ completed: 1, in_progress: 1, at_risk: 1, not_started: 0 });
  });
});

// Records written before `children` existed, hand-edited localStorage, or a
// partial cloud merge all produce nodes without that array. Every traversal
// in Atlas walks it directly, so the shape is repaired once on load.
describe("ensureGoalTreeShape", () => {
  it("gives a node with no children array an empty one", () => {
    const legacy = [{ id: "a", title: "A", type: "dream", status: "not_started", progress: 0, createdAt: "x", updatedAt: "y" }];
    const safe = ensureGoalTreeShape(legacy);

    expect(safe[0].children).toEqual([]);
  });

  it("repairs a missing children array deep in the tree", () => {
    const legacy = [{ id: "a", title: "A", type: "dream", status: "not_started", progress: 0, createdAt: "x", updatedAt: "y", children: [{ id: "b", title: "B", type: "milestone", status: "not_started", progress: 0, createdAt: "x", updatedAt: "y" }] }];
    const safe = ensureGoalTreeShape(legacy);

    expect(safe[0].children[0].children).toEqual([]);
  });

  it("leaves a well-formed tree's values untouched", () => {
    const safe = ensureGoalTreeShape(tree);

    expect(safe.map((entry) => entry.id)).toEqual(["year"]);
    expect(safe[0].children.map((entry) => entry.id)).toEqual(["q1", "q2"]);
    expect(safe[0].children[0].children.map((entry) => entry.id)).toEqual(["m1", "m2"]);
  });

  it("keeps every other field, including ones it knows nothing about", () => {
    const legacy = [{ id: "a", title: "Keep me", type: "dream", status: "in_progress", progress: 42, periodStart: "2026-01-01", futureField: "untouched", createdAt: "x", updatedAt: "y" }];
    const safe = ensureGoalTreeShape(legacy) as unknown as Array<Record<string, unknown>>;

    expect(safe[0].title).toBe("Keep me");
    expect(safe[0].progress).toBe(42);
    expect(safe[0].periodStart).toBe("2026-01-01");
    expect(safe[0].futureField).toBe("untouched");
  });

  it("survives children being the wrong type entirely", () => {
    const broken = [{ id: "a", title: "A", type: "dream", status: "not_started", progress: 0, createdAt: "x", updatedAt: "y", children: "not an array" }];

    expect(ensureGoalTreeShape(broken)[0].children).toEqual([]);
  });

  it("drops entries that are not objects rather than crashing on them", () => {
    expect(ensureGoalTreeShape([null, undefined, 7, "x"])).toEqual([]);
  });

  it("returns an empty tree for a non-array, including null", () => {
    expect(ensureGoalTreeShape(null)).toEqual([]);
    expect(ensureGoalTreeShape(undefined)).toEqual([]);
    expect(ensureGoalTreeShape({ nope: true })).toEqual([]);
  });

  it("makes a legacy tree safe for the traversals that used to crash on it", () => {
    const legacy = [{ id: "a", title: "A", type: "dream", status: "not_started", progress: 0, createdAt: "x", updatedAt: "y" }];
    const safe = ensureGoalTreeShape(legacy);

    // These are the calls that threw "Cannot read properties of undefined".
    expect(() => flattenVisibleTree(safe, new Set(["a"]))).not.toThrow();
    expect(() => countBranchStates(safe, TODAY)).not.toThrow();
    expect(collectNodeIds(safe)).toEqual(["a"]);
  });
});
