import type { GoalNodeView } from "../../_lib/goal-tree-progress";
import type { GoalTreeFilterKey, GoalTreeOutlineRowView } from "./goal-tree-outline.types";
import { goalTreeTypeFilterMap } from "./goal-tree-outline.types";
import type { Quest } from "../../_lib/types/quest";

function matchesFilter(node: GoalNodeView, filter: GoalTreeFilterKey) {
  if (filter === "all") {
    return true;
  }

  return goalTreeTypeFilterMap[filter].includes(node.type);
}

export function getGoalTreeFilterLabel(filter: GoalTreeFilterKey) {
  switch (filter) {
    case "dreams":
      return "Dreams";
    case "goals":
      return "Goals";
    case "milestones":
      return "Milestones";
    case "progress_goals":
      return "Progress Goals";
    case "daily_quests":
      return "Daily Quests";
    default:
      return "Overall Progress";
  }
}

export function collectNodesByFilter(nodes: GoalNodeView[], filter: GoalTreeFilterKey): GoalNodeView[] {
  if (filter === "all") {
    return nodes.flatMap((node) => [node, ...collectNodesByFilter(node.children, "all")]);
  }

  const allowedTypes = goalTreeTypeFilterMap[filter];
  return nodes.flatMap((node) => {
    const nested = collectNodesByFilter(node.children, filter);
    return (allowedTypes.includes(node.type) ? [node] : []).concat(nested);
  });
}

function collectDescendantProgressGoalIds(node: GoalNodeView): string[] {
  const ownIds = node.type === "progress_goal" ? [node.id] : [];
  return node.children.reduce<string[]>((accumulator, child) => {
    accumulator.push(...collectDescendantProgressGoalIds(child));
    return accumulator;
  }, ownIds);
}

export function collectRelatedQuestTitlesForFilter(nodes: GoalNodeView[], quests: Quest[], filter: GoalTreeFilterKey) {
  if (filter === "all") {
    return [];
  }

  if (filter === "progress_goals") {
    const progressGoalIds = collectNodesByFilter(nodes, filter)
      .filter((node) => node.type === "progress_goal")
      .map((node) => node.id);

    return quests
      .filter((quest) => quest.linkedProgressGoalId && progressGoalIds.includes(quest.linkedProgressGoalId))
      .map((quest) => quest.title);
  }

  const categoryNodes = collectNodesByFilter(nodes, filter).filter((node) => node.type !== "progress_goal");
  const descendantProgressGoalIds = categoryNodes.flatMap((node) => collectDescendantProgressGoalIds(node));

  return quests
    .filter((quest) => quest.linkedProgressGoalId && descendantProgressGoalIds.includes(quest.linkedProgressGoalId))
    .map((quest) => quest.title);
}

function matchesSearch(node: GoalNodeView, query: string) {
  if (!query) {
    return true;
  }

  return node.title.toLowerCase().includes(query);
}

export function collectGoalTreeOutlineRows(
  nodes: GoalNodeView[],
  options: Readonly<{
    search: string;
    filter: GoalTreeFilterKey;
    collapsedIds: ReadonlySet<string>;
  }>,
): GoalTreeOutlineRowView[] {
  const query = options.search.trim().toLowerCase();

  function walk(branch: GoalNodeView[], depth: number): GoalTreeOutlineRowView[] {
    const rows: GoalTreeOutlineRowView[] = [];

    for (const node of branch) {
      const childRows = query || !options.collapsedIds.has(node.id) ? walk(node.children, depth + 1) : [];

      if (query) {
        const includeNode = matchesSearch(node, query) || childRows.length > 0;

        if (!includeNode) {
          continue;
        }

        rows.push({ node, depth });
        rows.push(...childRows);
        continue;
      }

      const includeNode = matchesFilter(node, options.filter);

      if (includeNode) {
        rows.push({ node, depth });
      }

      if (!options.collapsedIds.has(node.id)) {
        rows.push(...childRows);
      }
    }

    return rows;
  }

  return walk(nodes, 0);
}

export function findOutlineNode(nodes: GoalNodeView[], nodeId: string): GoalNodeView | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }

    const nested = findOutlineNode(node.children, nodeId);

    if (nested) {
      return nested;
    }
  }

  return null;
}

export function findOutlineParentTitle(nodes: GoalNodeView[], parentId?: string) {
  if (!parentId) {
    return undefined;
  }

  return findOutlineNode(nodes, parentId)?.title;
}

export function findOutlinePath(nodes: GoalNodeView[], nodeId?: string): GoalNodeView[] {
  if (!nodeId) {
    return [];
  }

  for (const node of nodes) {
    if (node.id === nodeId) {
      return [node];
    }

    const nestedPath = findOutlinePath(node.children, nodeId);

    if (nestedPath.length > 0) {
      return [node, ...nestedPath];
    }
  }

  return [];
}
