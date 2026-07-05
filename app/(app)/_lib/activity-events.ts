import { categories } from "./mock/categories";
import { getLocalDayKey } from "./local-day";
import type { ActivityEvent, ActivityEventType } from "./types/activity-event";
import type { CategoryId } from "./types/category";
import type { DailySnapshot } from "./types/daily-system";
import type { GoalNode, GoalTree } from "./types/goal-tree";
import type { XpEvent } from "./types/progression";
import type { Quest, QuestAttributeReward, QuestCompletion } from "./types/quest";

export const MAX_ACTIVITY_EVENTS = 2000;

function activityEventId(type: ActivityEventType, sourceId: string, createdAt: string, suffix = "") {
  return [type, sourceId, createdAt, suffix].filter(Boolean).join(":");
}

function sortNewestFirst(events: ReadonlyArray<ActivityEvent>) {
  return [...events].sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());
}

export function addActivityEvents(current: ReadonlyArray<ActivityEvent>, nextEvents: ReadonlyArray<ActivityEvent>) {
  const eventsById = new Map<string, ActivityEvent>();

  for (const event of [...nextEvents, ...current]) {
    eventsById.set(event.id, event);
  }

  return sortNewestFirst(Array.from(eventsById.values())).slice(0, MAX_ACTIVITY_EVENTS);
}

export function removeActivityEventsByCompletionId(current: ReadonlyArray<ActivityEvent>, completionId: string) {
  return current.filter((event) => event.metadata.completionId !== completionId);
}

export function getEvents(events: ReadonlyArray<ActivityEvent>) {
  return sortNewestFirst(events);
}

export function getEventsByType(events: ReadonlyArray<ActivityEvent>, type: ActivityEventType) {
  return getEvents(events).filter((event) => event.type === type);
}

export function getEventsByDate(events: ReadonlyArray<ActivityEvent>, dateKey: string) {
  return getEvents(events).filter((event) => getLocalDayKey(event.createdAt) === dateKey);
}

export function getTodayEvents(events: ReadonlyArray<ActivityEvent>, referenceDate = new Date()) {
  return getEventsByDate(events, getLocalDayKey(referenceDate));
}

export function getWeekEvents(events: ReadonlyArray<ActivityEvent>, referenceDate = new Date()) {
  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

  return getEvents(events).filter((event) => {
    const createdAt = new Date(event.createdAt).getTime();
    return createdAt >= start.getTime() && createdAt <= end.getTime();
  });
}

export function getMonthEvents(events: ReadonlyArray<ActivityEvent>, referenceDate = new Date()) {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59, 999);

  return getEvents(events).filter((event) => {
    const createdAt = new Date(event.createdAt).getTime();
    return createdAt >= start.getTime() && createdAt <= end.getTime();
  });
}

export function getEventsByAttribute(events: ReadonlyArray<ActivityEvent>, attributeId: CategoryId) {
  return getEvents(events).filter((event) => event.metadata.attributeId === attributeId || event.metadata.categoryId === attributeId);
}

export function getEventsByDream(events: ReadonlyArray<ActivityEvent>, dreamId: string) {
  return getEvents(events).filter((event) => event.sourceId === dreamId || event.metadata.dreamId === dreamId);
}

function getCategoryName(attributeId: CategoryId) {
  return categories.find((category) => category.id === attributeId)?.name ?? attributeId;
}

export function createQuestActivityEvents(
  quest: Quest,
  completion: QuestCompletion,
  attributeRewardsAwarded: ReadonlyArray<QuestAttributeReward>,
): ActivityEvent[] {
  const createdAt = completion.completedAt;
  const rewards = attributeRewardsAwarded.length > 0 ? attributeRewardsAwarded : [{ attributeId: quest.categoryId, xp: completion.xpAwarded }];

  return [
    {
      id: activityEventId("quest_completed", completion.id, createdAt),
      type: "quest_completed",
      createdAt,
      title: `${quest.title} completed`,
      description: quest.description ?? "Quest completed.",
      sourceType: "quest",
      sourceId: quest.id,
      metadata: {
        completionId: completion.id,
        questId: quest.id,
        questName: quest.title,
        importance: quest.importance ?? "core",
        categoryId: quest.categoryId,
      },
    },
    {
      id: activityEventId("quest_xp_awarded", completion.id, createdAt),
      type: "quest_xp_awarded",
      createdAt,
      title: `+${completion.xpAwarded.toLocaleString()} Quest XP`,
      description: quest.title,
      sourceType: "quest",
      sourceId: quest.id,
      metadata: {
        completionId: completion.id,
        questId: quest.id,
        questName: quest.title,
        xp: completion.xpAwarded,
      },
    },
    ...rewards.map((reward) => ({
      id: activityEventId("attribute_xp_awarded", completion.id, createdAt, reward.attributeId),
      type: "attribute_xp_awarded" as const,
      createdAt,
      title: `${getCategoryName(reward.attributeId)} +${reward.xp.toLocaleString()} XP`,
      description: quest.title,
      sourceType: "attribute" as const,
      sourceId: reward.attributeId,
      metadata: {
        completionId: completion.id,
        questId: quest.id,
        questName: quest.title,
        attributeId: reward.attributeId,
        attributeName: getCategoryName(reward.attributeId),
        xp: reward.xp,
      },
    })),
  ];
}

export function createProgressGoalUpdatedEvent({
  node,
  oldValue,
  newValue,
  createdAt,
}: Readonly<{
  node: GoalNode;
  oldValue: number;
  newValue: number;
  createdAt: string;
}>): ActivityEvent | null {
  if (node.type !== "progress_goal" || oldValue === newValue) {
    return null;
  }

  return {
    id: activityEventId("progress_goal_updated", node.id, createdAt, `${oldValue}-${newValue}`),
    type: "progress_goal_updated",
    createdAt,
    title: `${node.title} updated`,
    description: `${oldValue.toLocaleString()} -> ${newValue.toLocaleString()}${node.unit ? ` ${node.unit}` : ""}`,
    sourceType: "progress_goal",
    sourceId: node.id,
    metadata: {
      progressGoalId: node.id,
      progressGoalName: node.title,
      oldValue,
      newValue,
      target: node.targetValue ?? 0,
      unit: node.unit ?? "",
    },
  };
}

function flattenGoalTree(nodes: GoalTree): GoalNode[] {
  return nodes.flatMap((node) => [node, ...flattenGoalTree(node.children)]);
}

function isGoalNodeComplete(node: GoalNode) {
  return node.status === "completed" || node.progress >= 100 || Boolean(node.xpAwardedAt);
}

function completionEventType(node: GoalNode): ActivityEventType | null {
  if (node.type === "progress_goal") {
    return "progress_goal_completed";
  }

  if (node.type === "dream") {
    return "dream_completed";
  }

  if (node.type === "long_term_goal") {
    return "goal_completed";
  }

  if (node.type === "milestone" || node.type === "sequential_milestone") {
    return "milestone_completed";
  }

  return null;
}

export function createGoalCompletionActivityEvents(previousTree: GoalTree, nextTree: GoalTree, createdAt: string): ActivityEvent[] {
  const previousCompleteIds = new Set(flattenGoalTree(previousTree).filter(isGoalNodeComplete).map((node) => node.id));

  return flattenGoalTree(nextTree).flatMap((node) => {
    const type = completionEventType(node);

    if (!type || previousCompleteIds.has(node.id) || !isGoalNodeComplete(node)) {
      return [];
    }

    return [
      {
        id: activityEventId(type, node.id, createdAt),
        type,
        createdAt,
        title: `${node.title} completed`,
        description: node.description ?? node.type.replaceAll("_", " "),
        sourceType: node.type === "dream" ? "dream" : node.type === "progress_goal" ? "progress_goal" : node.type === "milestone" || node.type === "sequential_milestone" ? "milestone" : "goal",
        sourceId: node.id,
        metadata: {
          nodeId: node.id,
          nodeName: node.title,
          nodeType: node.type,
          progress: node.progress,
        },
      },
    ];
  });
}

export function createGoalXpActivityEvents(events: ReadonlyArray<XpEvent>): ActivityEvent[] {
  return events.flatMap((event) => [
    {
      id: activityEventId("goal_xp_awarded", event.id, event.createdAt),
      type: "goal_xp_awarded" as const,
      createdAt: event.createdAt,
      title: `${event.sourceTitle} +${event.amount.toLocaleString()} XP`,
      description: "Goal XP awarded.",
      sourceType: event.sourceType === "dream" ? "dream" : event.sourceType === "progress_goal" ? "progress_goal" : event.sourceType === "milestone" || event.sourceType === "sequential_milestone" || event.sourceType === "sequential_step" ? "milestone" : "goal",
      sourceId: event.sourceId,
      metadata: {
        xpEventId: event.id,
        sourceType: event.sourceType,
        sourceTitle: event.sourceTitle,
        xp: event.amount,
      },
    },
    ...event.attributeXp.map((reward) => ({
      id: activityEventId("attribute_xp_awarded", event.id, event.createdAt, reward.attributeId),
      type: "attribute_xp_awarded" as const,
      createdAt: event.createdAt,
      title: `${getCategoryName(reward.attributeId)} +${reward.amount.toLocaleString()} XP`,
      description: event.sourceTitle,
      sourceType: "attribute" as const,
      sourceId: reward.attributeId,
      metadata: {
        xpEventId: event.id,
        attributeId: reward.attributeId,
        attributeName: getCategoryName(reward.attributeId),
        xp: reward.amount,
      },
    })),
  ]);
}

export function createDailySnapshotSavedEvent(snapshot: DailySnapshot): ActivityEvent {
  return {
    id: activityEventId("daily_snapshot_saved", snapshot.id, snapshot.updatedAt),
    type: "daily_snapshot_saved",
    createdAt: snapshot.updatedAt,
    title: "Daily Snapshot Saved",
    description: `${snapshot.dailySuccessPercent}% daily success recorded.`,
    sourceType: "daily_snapshot",
    sourceId: snapshot.id,
    metadata: {
      snapshotId: snapshot.id,
      date: snapshot.date,
      dailySuccessPercent: snapshot.dailySuccessPercent,
      questXpEarned: snapshot.questXpEarned,
    },
  };
}
