import { daysBetween } from "./signal-engine";
import type { GoalTree } from "../types/goal-tree";
import type { Quest, EisenhowerQuadrant } from "../types/quest";
import type { ActivityEvent, ActivityEventType } from "../types/activity-event";
import type { PresentMomentState } from "../engines/present-moment-engine";
import type { PersonalSignal, PersonalState, UpcomingDeadline } from "./types";

// Phase 11's State Engine - a deterministic snapshot of "what is happening
// right now." Deliberately does NOT recompute the Present-Moment Engine,
// Priority Gate, or active-mission logic: those are passed in straight from
// useAtlasContext() (the existing Global Atlas Context), and this module
// only adds the signal-derived layer (momentum/friction/neglect/workload/
// focus quality/achievements/deadlines) on top.

export type StateEngineInput = Readonly<{
  now: Date;
  goalTree: GoalTree;
  activityEvents: ReadonlyArray<ActivityEvent>;
  presentMoment: PresentMomentState;
  activeQuest: Quest | null;
  isQuestExecution: boolean;
  currentPriorityQuadrant: EisenhowerQuadrant | null;
  signals: ReadonlyArray<PersonalSignal>;
}>;

const ACHIEVEMENT_WINDOW_DAYS = 7;
const ACHIEVEMENT_EVENT_TYPES: ReadonlyArray<ActivityEventType> = ["achievement_unlocked", "level_up", "streak_milestone", "goal_completed", "dream_completed", "milestone_completed"];
const DEADLINE_WINDOW_DAYS = 30;

export function computePersonalState(input: StateEngineInput): PersonalState {
  const activeMission = input.isQuestExecution && input.activeQuest ? { questId: input.activeQuest.id, title: input.activeQuest.title } : null;

  const recentAchievementTitles = input.activityEvents
    .filter((event) => ACHIEVEMENT_EVENT_TYPES.includes(event.type) && daysBetween(input.now, event.createdAt) < ACHIEVEMENT_WINDOW_DAYS)
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
    .slice(0, 5)
    .map((event) => event.title);

  const upcomingDeadlines: UpcomingDeadline[] = input.goalTree
    .filter((node) => Boolean(node.periodEnd) && node.status !== "completed")
    .map((node) => ({
      goalId: node.id,
      title: node.title,
      periodEnd: node.periodEnd as string,
      daysRemaining: Math.ceil((new Date(node.periodEnd as string).getTime() - input.now.getTime()) / 86_400_000),
      progress: node.progress,
    }))
    .filter((deadline) => deadline.daysRemaining <= DEADLINE_WINDOW_DAYS)
    .sort((first, second) => first.daysRemaining - second.daysRemaining);

  return {
    presentMoment: input.presentMoment,
    activeMission,
    currentPriority: input.currentPriorityQuadrant,
    goalMomentum: input.signals.filter((signal) => signal.type === "momentum"),
    friction: input.signals.filter((signal) => signal.type === "friction"),
    neglectedAreas: input.signals.filter((signal) => signal.type === "neglect"),
    workload: input.signals.find((signal) => signal.type === "overload") ?? null,
    focusQuality: input.signals.find((signal) => signal.type === "focus_quality") ?? null,
    completionMomentum: input.signals.find((signal) => signal.type === "completion_momentum") ?? null,
    priorityConflict: input.signals.find((signal) => signal.type === "priority_conflict") ?? null,
    recentAchievementTitles,
    upcomingDeadlines,
  };
}
