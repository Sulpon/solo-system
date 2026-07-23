import type { CategoryId } from "./category";

export type QuestAttributeReward = Readonly<{
  attributeId: CategoryId;
  xp: number;
}>;

export type Task = Readonly<{
  id: string;
  title: string;
  xp: number;
  completed: boolean;
}>;

export type QuestCadence = "daily" | "weekly" | "one-time";
export type QuestStatus = "active" | "archived";
export type QuestImportance = "core" | "bonus";

export type Quest = Readonly<{
  id: string;
  title: string;
  description?: string;
  categoryId: CategoryId;
  xp: number;
  cadence: QuestCadence;
  importance?: QuestImportance;
  scheduledDays?: ReadonlyArray<number>;
  status: QuestStatus;
  linkedProgressGoalId?: string | null;
  linkedWorkoutTemplateId?: string | null;
  attributeXPOverride?: ReadonlyArray<QuestAttributeReward>;
  createdAt: string;
  updatedAt: string;
}>;

export type DailyQuest = Readonly<{
  id: string;
  title: string;
  description: string;
  category: CategoryId;
  xp: number;
  importance?: QuestImportance;
  scheduledDays?: ReadonlyArray<number>;
  completed: boolean;
  linkedProgressGoalId?: string | null;
  linkedWorkoutTemplateId?: string | null;
  attributeXPOverride?: ReadonlyArray<QuestAttributeReward>;
}>;

export type QuestCompletion = Readonly<{
  id: string;
  questId: string;
  completedAt: string;
  xpAwarded: number;
  attributeRewardsAwarded: ReadonlyArray<QuestAttributeReward>;
}>;
