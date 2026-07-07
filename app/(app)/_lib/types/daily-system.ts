import type { CategoryId } from "./category";

export type DailySnapshotAttributeXp = Readonly<{
  attributeId: CategoryId;
  amount: number;
}>;

export type DailyProgressGoalUpdate = Readonly<{
  progressGoalId: string;
  questId: string;
}>;

export type DailySnapshot = Readonly<{
  id: string;
  date: string;
  coreQuestIds: string[];
  completedCoreQuestIds: string[];
  bonusQuestIds: string[];
  completedBonusQuestIds: string[];
  questXpEarned: number;
  attributeXpEarned: DailySnapshotAttributeXp[];
  completedGoalNodeIds: string[];
  progressGoalUpdates: DailyProgressGoalUpdate[];
  dailySuccessPercent: number;
  reviewed: boolean;
  // Optional, user-written reflection - never required, never auto-filled.
  reflectionNote?: string;
  createdAt: string;
  updatedAt: string;
}>;
