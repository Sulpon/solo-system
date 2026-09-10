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

// A pure classification of the existing Quest, orthogonal to cadence/
// scheduling - "is this a Task or a Habit," not "how often does it recur."
// Named `kind` rather than `category` deliberately: Quest already has
// `categoryId` (an Attribute, e.g. "discipline") and DailyQuest has
// `category` for the same concept - reusing that word for Task/Habit would
// collide with an already-established, unrelated meaning. Absent means
// uncategorized (a legacy quest, or one the user hasn't sorted yet) - never
// inferred from cadence or any other field (see quest-storage.ts).
export type QuestKind = "task" | "habit";
export const QUEST_KINDS: ReadonlyArray<QuestKind> = ["task", "habit"];

// Eisenhower priority classification - applies ONLY to Tasks (kind ===
// "task"), never to Habits. Orthogonal to scheduling: a Task's quadrant
// says nothing about when/how often it runs (see scheduledDate/
// scheduledDays/cadence above) - it is purely a priority label. IDs are
// stable and never renamed; user-facing display names live separately in
// types/eisenhower-settings.ts so relabeling never touches stored Tasks or
// this id. Order here is the natural priority ranking (index 0 = highest),
// which a future Priority Gate can read directly without another type.
export type EisenhowerQuadrant = "urgent_important" | "urgent_not_important" | "not_urgent_important" | "not_urgent_not_important";
export const EISENHOWER_QUADRANTS: ReadonlyArray<EisenhowerQuadrant> = [
  "urgent_important",
  "urgent_not_important",
  "not_urgent_important",
  "not_urgent_not_important",
];

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
  // Real Calendar scheduling - independent of the scheduledDays recurrence
  // picker above. scheduledDate is a one-time occurrence on that exact local
  // day (YYYY-MM-DD, see local-day.ts); mutually exclusive with a non-empty
  // scheduledDays in practice (the Calendar engine checks scheduledDate
  // first - see getQuestsForDate in quest-calendar-engine.ts). Start/end are
  // "HH:MM" 24h local time and apply to every occurrence, one-time or
  // recurring; absent means an all-day item. All optional and additive - a
  // Quest saved before these fields existed is simply unscheduled.
  scheduledDate?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  // Task vs Habit classification - see QuestKind above. Optional and
  // additive; a Quest saved before this field existed is simply
  // uncategorized, never guessed at.
  kind?: QuestKind;
  // Eisenhower priority quadrant - see EisenhowerQuadrant above. Only
  // meaningful when kind === "task"; every write path (QuestManagerPage's
  // drag handler, upsertQuestFromForm) clears this whenever kind isn't
  // "task", so a Habit can never carry a stale quadrant. Absent means no
  // priority chosen yet, never guessed at.
  eisenhowerQuadrant?: EisenhowerQuadrant;
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
  // Absent means DEFAULT_QUEST_MASTERY_MULTIPLIER (see quest-mastery-engine.ts).
  // Level 100 Mastery = this quest's base xp * masteryMultiplier.
  masteryMultiplier?: number;
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
  masteryMultiplier?: number;
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
