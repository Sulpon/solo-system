import type { GoalNode, GoalNodeStatus, GoalTree, GoalTreeSummary } from "./types/goal-tree";

export type GoalNodeView = Omit<GoalNode, "children"> & Readonly<{
  completedCount: number;
  totalCount: number;
  depth: number;
  children: GoalNodeView[];
}>;

function getLeafProgress(status: GoalNodeStatus) {
  if (status === "completed") {
    return 100;
  }

  if (status === "in_progress") {
    return 50;
  }

  return 0;
}

function computeNode(node: GoalNode, depth: number): GoalNodeView {
  const children = node.children.map((child) => computeNode(child, depth + 1));

  if (node.type === "sequential_milestone") {
    const steps = node.steps ?? [];
    const completedCount = steps.filter((step) => step.completed).length;
    const totalCount = steps.length;
    const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
    const currentStepIndex = steps.findIndex((step) => !step.completed);
    const resolvedCurrentStepIndex = currentStepIndex >= 0 ? currentStepIndex : totalCount;

    return {
      ...node,
      progress,
      status: totalCount > 0 && completedCount === totalCount ? "completed" : completedCount > 0 ? "in_progress" : "not_started",
      completedCount,
      totalCount,
      depth,
      currentStepIndex: resolvedCurrentStepIndex,
      completed: totalCount > 0 && completedCount === totalCount,
      children,
    };
  }

  if (children.length === 0) {
    const progress =
      node.type === "progress_goal"
        ? Math.min(100, Math.round((Math.max(0, Number(node.currentValue ?? 0)) / Math.max(1, Number(node.targetValue ?? 1))) * 100))
        : getLeafProgress(node.status);

    return {
      ...node,
      progress,
      status:
        node.type === "progress_goal"
          ? progress >= 100
            ? "completed"
            : progress > 0
              ? "in_progress"
              : "not_started"
          : node.status,
      completedCount: progress >= 100 ? 1 : 0,
      totalCount: 1,
      depth,
      children,
    };
  }

  const totalProgress = children.reduce((sum, child) => sum + child.progress, 0);
  const progress = Math.round(totalProgress / children.length);
  const completedCount = children.reduce((sum, child) => sum + child.completedCount, 0);
  const totalCount = children.reduce((sum, child) => sum + child.totalCount, 0);

  return {
    ...node,
    status: completedCount === totalCount ? "completed" : progress > 0 ? "in_progress" : "not_started",
    progress,
    completedCount,
    totalCount,
    depth,
    children,
  };
}

export function calculateGoalTree(nodes: GoalTree): GoalNodeView[] {
  return nodes.map((node) => computeNode(node, 0));
}

export function summarizeGoalTree(nodes: GoalTree): GoalTreeSummary {
  const roots = calculateGoalTree(nodes);

  function countLeafNodes(items: GoalNodeView[]): { total: number; completed: number } {
    return items.reduce(
      (accumulator, node) => {
        if (node.children.length === 0) {
          accumulator.total += 1;
          accumulator.completed += node.progress === 100 ? 1 : 0;
          return accumulator;
        }

        const nested = countLeafNodes(node.children);
        accumulator.total += nested.total;
        accumulator.completed += nested.completed;
        return accumulator;
      },
      { total: 0, completed: 0 },
    );
  }

  const leafCounts = countLeafNodes(roots);
  const progress = leafCounts.total === 0 ? 0 : Math.round((leafCounts.completed / leafCounts.total) * 100);

  return {
    rootCount: roots.length,
    directChildrenCount: leafCounts.total,
    completedChildrenCount: leafCounts.completed,
    progress,
  };
}
