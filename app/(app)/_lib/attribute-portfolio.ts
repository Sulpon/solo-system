import { calculateGoalTree, type GoalNodeView } from "./goal-tree-progress";
import type { GoalTree } from "./types/goal-tree";
import type { Quest } from "./types/quest";

export type AttributePortfolio = Readonly<{
  dreams: GoalNodeView[];
  goals: GoalNodeView[];
  milestones: GoalNodeView[];
  progressGoals: GoalNodeView[];
  quests: Quest[];
}>;

function sortByUpdatedAtDesc<T extends { updatedAt: string }>(items: T[]) {
  return [...items].sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime());
}

export function getAttributePortfolio(goalTree: GoalTree, quests: ReadonlyArray<Quest>, attributeId: string): AttributePortfolio {
  const tree = calculateGoalTree(goalTree);
  const dreams: GoalNodeView[] = [];
  const goals: GoalNodeView[] = [];
  const milestones: GoalNodeView[] = [];
  const progressGoals: GoalNodeView[] = [];
  const relatedProgressGoalIds = new Set<string>();

  function walk(nodes: GoalNodeView[], inheritedAttributeIds: string[]) {
    for (const node of nodes) {
      const currentAttributeIds = node.type === "dream" ? [...(node.attributes ?? [])] : inheritedAttributeIds;
      const related = currentAttributeIds.includes(attributeId);

      if (related) {
        switch (node.type) {
          case "dream":
            dreams.push(node);
            break;
          case "long_term_goal":
            goals.push(node);
            break;
          case "milestone":
          case "sequential_milestone":
            milestones.push(node);
            break;
          case "progress_goal":
            progressGoals.push(node);
            relatedProgressGoalIds.add(node.id);
            break;
          default:
            break;
        }
      }

      if (node.type === "dream") {
        walk(node.children, currentAttributeIds);
        continue;
      }

      if (related || inheritedAttributeIds.includes(attributeId)) {
        walk(node.children, currentAttributeIds);
      } else {
        walk(node.children, inheritedAttributeIds);
      }
    }
  }

  walk(tree, []);

  const questsForAttribute = quests.filter((quest) => quest.linkedProgressGoalId && relatedProgressGoalIds.has(quest.linkedProgressGoalId));

  return {
    dreams: sortByUpdatedAtDesc(dreams),
    goals: sortByUpdatedAtDesc(goals),
    milestones: sortByUpdatedAtDesc(milestones),
    progressGoals: sortByUpdatedAtDesc(progressGoals),
    quests: sortByUpdatedAtDesc(questsForAttribute),
  };
}
