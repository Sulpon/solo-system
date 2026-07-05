import { calculateGoalTree, type GoalNodeView } from "../../_lib/goal-tree-progress";
import { getLocalDayKey } from "../../_lib/local-day";
import type { GoalTree } from "../../_lib/types/goal-tree";
import type { QuestCompletion } from "../../_lib/types/quest";
import type { XpEvent } from "../../_lib/types/progression";
import type { DashboardDreamItem, DashboardMilestoneItem } from "./dashboard-overview.types";

export function getLiveDreamProgress(goalTree: GoalTree): DashboardDreamItem[] {
  const tree = calculateGoalTree(goalTree);
  return tree
    .map((node) => ({
      id: node.id,
      title: node.title,
      subtitle: node.description ?? node.type.replaceAll("_", " "),
      progress: node.progress,
      depth: node.depth,
      updatedAt: node.updatedAt,
    }))
    .sort((first, second) => second.progress - first.progress || new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime())
    .slice(0, 4);
}

function flattenGoalNodes(nodes: GoalNodeView[]): GoalNodeView[] {
  return nodes.flatMap((node) => [node, ...flattenGoalNodes(node.children)]);
}

export function getRecentGoalMilestones(goalTree: GoalTree): DashboardMilestoneItem[] {
  const tree = calculateGoalTree(goalTree);
  const completedNodes = flattenGoalNodes(tree)
    .filter((node) => node.progress >= 100 || node.status === "completed")
    .sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime())
    .slice(0, 3);

  return completedNodes.map((node) => ({
    title: node.title,
    subtitle: node.description ?? node.type.replaceAll("_", " "),
    date: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(node.updatedAt)),
    accent:
      node.type === "progress_goal"
        ? "text-orange-300"
        : node.type === "sequential_milestone"
          ? "text-fuchsia-300"
          : node.type === "quest"
            ? "text-emerald-300"
            : "text-purple-300",
  }));
}

export function getWeeklyXpSeries(completions: ReadonlyArray<QuestCompletion>, goalXpEvents: ReadonlyArray<XpEvent> = []) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      key: getLocalDayKey(date),
      label: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date).slice(0, 2),
      value: 0,
    };
  });

  const bucketIndexByKey = new Map(buckets.map((bucket, index) => [bucket.key, index]));

  const entries = [
    ...completions.map((completion) => ({
      completedAt: completion.completedAt,
      amount: completion.xpAwarded,
    })),
    ...goalXpEvents.map((event) => ({
      completedAt: event.createdAt,
      amount: event.amount,
    })),
  ];

  for (const completion of entries) {
    const completionKey = getLocalDayKey(completion.completedAt);
    const bucketIndex = bucketIndexByKey.get(completionKey);

    if (bucketIndex === undefined) {
      continue;
    }

    buckets[bucketIndex].value += completion.amount;
  }

  return buckets;
}
