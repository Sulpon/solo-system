import { getLocalDayKey, parseLocalDayKey } from "../local-day";
import type { GoalNode, GoalTree } from "../types/goal-tree";

// Laying the real GoalNode tree out as a connected hierarchy.
//
// Pure: it reads the tree it is given and returns rows. It never computes
// progress (that is goal-tree-progress.ts, already rolled up before this
// runs) and never mutates anything.

export type GoalBranchState = "completed" | "at_risk" | "in_progress" | "not_started";

// Deliberately four states, not five.
//
// GoalNodeStatus is not_started | in_progress | completed, and Atlas models
// no blocker or dependency anywhere, so a red "blocked" node would be a
// colour with nothing behind it. "At risk" IS derivable from real fields -
// the period has ended and the work did not finish - so it earns its place.
export function getBranchState(node: GoalNode, today: Date = new Date()): GoalBranchState {
  if (node.status === "completed" || node.progress >= 100) {
    return "completed";
  }

  if (node.periodEnd && getLocalDayKey(parseLocalDayKey(node.periodEnd)) < getLocalDayKey(today)) {
    return "at_risk";
  }

  if (node.status === "in_progress" || node.progress > 0) {
    return "in_progress";
  }

  return "not_started";
}

export type GoalTreeRow = Readonly<{
  node: GoalNode;
  depth: number;
  childCount: number;
  isExpanded: boolean;
  isLastChild: boolean;
  // One flag per ancestor level, outermost first: does a vertical rail
  // continue down past this row at that depth? That is the whole trick to
  // drawing connected branches without measuring anything in the DOM - a
  // rail continues exactly when that ancestor still has a later sibling.
  ancestorRails: ReadonlyArray<boolean>;
}>;

// Depth-first, parents before children, skipping the subtree of anything
// collapsed. The order is the render order.
export function flattenVisibleTree(roots: GoalTree, expandedIds: ReadonlySet<string>): GoalTreeRow[] {
  const rows: GoalTreeRow[] = [];

  function walk(nodes: GoalTree, depth: number, ancestorRails: ReadonlyArray<boolean>) {
    nodes.forEach((node, index) => {
      const isLastChild = index === nodes.length - 1;
      const children = node.children ?? [];
      const isExpanded = expandedIds.has(node.id);

      rows.push({ node, depth, childCount: children.length, isExpanded, isLastChild, ancestorRails });

      if (isExpanded && children.length > 0) {
        // A rail continues under this node exactly when it has a sibling
        // below it to connect to.
        walk(children, depth + 1, [...ancestorRails, !isLastChild]);
      }
    });
  }

  walk(roots, 0, []);
  return rows;
}

export function collectNodeIds(roots: GoalTree): string[] {
  const ids: string[] = [];

  function walk(nodes: GoalTree) {
    for (const node of nodes) {
      ids.push(node.id);
      walk(node.children ?? []);
    }
  }

  walk(roots);
  return ids;
}

// Only the nodes that can actually be opened, so "expand all" does not
// stash ids for leaves that will never render a chevron.
export function collectExpandableIds(roots: GoalTree): string[] {
  const ids: string[] = [];

  function walk(nodes: GoalTree) {
    for (const node of nodes) {
      const children = node.children ?? [];

      if (children.length > 0) {
        ids.push(node.id);
        walk(children);
      }
    }
  }

  walk(roots);
  return ids;
}

// The ancestors of a node, outermost first, excluding the node itself.
// Expanding these is what reveals a node buried in a collapsed branch.
export function findAncestorIds(roots: GoalTree, nodeId: string): string[] {
  let found: string[] | null = null;

  function walk(nodes: GoalTree, trail: ReadonlyArray<string>) {
    for (const node of nodes) {
      if (found) {
        return;
      }

      if (node.id === nodeId) {
        found = [...trail];
        return;
      }

      walk(node.children ?? [], [...trail, node.id]);
    }
  }

  walk(roots, []);
  return found ?? [];
}

export function findNodeInTree(roots: GoalTree, nodeId: string): GoalNode | null {
  for (const node of roots) {
    if (node.id === nodeId) {
      return node;
    }

    const hit = findNodeInTree(node.children ?? [], nodeId);

    if (hit) {
      return hit;
    }
  }

  return null;
}

export type BranchStateCounts = Readonly<Record<GoalBranchState, number>>;

export function countBranchStates(roots: GoalTree, today: Date = new Date()): BranchStateCounts {
  const counts: Record<GoalBranchState, number> = { completed: 0, at_risk: 0, in_progress: 0, not_started: 0 };

  function walk(nodes: GoalTree) {
    for (const node of nodes) {
      counts[getBranchState(node, today)] += 1;
      walk(node.children ?? []);
    }
  }

  walk(roots);
  return counts;
}
