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

// xp is optional and defaults to 0 (no bonus) so every Challenge quest saved
// before this field existed keeps awarding exactly the XP it always has.
export type QuestChallengeLevel = Readonly<{ target: number; xp?: number }>;

// Pure configuration - no mutable progress here. Current level/streak are
// always derived from QuestCompletion history (see engines/challenge-engine.ts),
// the same way Quest streaks already are, so there is nothing to drift.
export type QuestChallengeConfig = Readonly<{
  enabled: boolean;
  levels: ReadonlyArray<QuestChallengeLevel>;
  requiredStreak: number;
}>;

// Custom badge title at a specific streak count (e.g. 10 -> "Attention
// Keeper"). Streak counts without an entry here still fire a generic
// milestone celebration every streakMilestoneInterval days.
export type QuestStreakMilestone = Readonly<{ streakCount: number; title: string }>;

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
  // Absent interval defaults to 10 days. Both fields are optional and purely
  // additive - existing quests keep behaving exactly as before until edited.
  streakMilestones?: ReadonlyArray<QuestStreakMilestone>;
  streakMilestoneInterval?: number;
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
  streakMilestones?: ReadonlyArray<QuestStreakMilestone>;
  streakMilestoneInterval?: number;
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
  // The portion of xpAwarded from clearing a Challenge level on this
  // completion (mirrors streakBonusXp). Absent/0 on completions that didn't
  // clear a level, and on every completion recorded before this field
  // existed - undo removes it automatically since it's baked into xpAwarded.
  challengeBonusXp?: number;
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
