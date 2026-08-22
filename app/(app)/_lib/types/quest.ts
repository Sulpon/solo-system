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

// How a completion's quantity is captured. "boolean" never prompts (a
// single completion = 1 unit of progress); "numeric" prompts for a value
// (or, when autoSource is set, derives it from real data elsewhere - e.g.
// today's Workout sessions - with no prompt at all). Absent entirely on a
// Quest means "infer from context" - see useQuestCompletionFlow.ts, which
// treats legacy goal-linked quests as numeric (their historically observed
// behavior) and everything else as boolean.
export type QuestCompletionMetricType = "boolean" | "numeric";

export type QuestCompletionAutoSource = "workout-sessions";

export type QuestCompletionMetricConfig = Readonly<{
  type: QuestCompletionMetricType;
  // Free-text unit label for numeric quests ("trades", "pages", "km", ...).
  // One field covers Count/Duration/Distance/Pages/Words/Custom rather than
  // a long enum of structurally-identical "number + label" variants.
  unit?: string;
  autoSource?: QuestCompletionAutoSource;
}>;

export type QuestChallengeLevel = Readonly<{ target: number }>;

// Pure configuration - no mutable progress here. Current level/streak are
// always derived from QuestCompletion history (see engines/challenge-engine.ts),
// the same way Quest streaks already are, so there is nothing to drift.
export type QuestChallengeConfig = Readonly<{
  enabled: boolean;
  levels: ReadonlyArray<QuestChallengeLevel>;
  requiredStreak: number;
}>;

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
  completionMetric?: QuestCompletionMetricConfig;
  challenge?: QuestChallengeConfig;
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
  completionMetric?: QuestCompletionMetricConfig;
  challenge?: QuestChallengeConfig;
  createdAt?: string;
}>;

export type QuestGoalContribution = Readonly<{
  goalId: string;
  amount: number;
}>;

export type QuestCompletion = Readonly<{
  id: string;
  questId: string;
  completedAt: string;
  xpAwarded: number;
  streakBonusXp: number;
  attributeRewardsAwarded: ReadonlyArray<QuestAttributeReward>;
  // What this completion actually recorded (trades, days=1 for a boolean
  // quest, ...). Absent on completions created before this field existed.
  metricValue?: number;
  // The exact delta this completion applied to a linked goal, if any -
  // stored so undo can reverse precisely instead of guessing. Absent on
  // pre-existing completions, which are undoable but not reversible against
  // a goal (there is nothing recorded to reverse).
  goalContribution?: QuestGoalContribution | null;
}>;
