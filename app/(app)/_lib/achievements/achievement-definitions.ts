import type { QuestCompletion } from "../types/quest";

// Threshold-crossing achievements that aren't already covered by an existing
// completion mechanism. Domain milestones with a natural existing "done"
// concept (a progress_goal reaching its target, e.g. "500 trades" or "1000
// pages") are deliberately NOT duplicated here - see useProgressionEventSync,
// which mirrors goal-tree completions into the reward collection directly
// instead of re-deriving a parallel threshold check (that would risk
// double-awarding XP for the same real-world milestone). Workout Personal
// Records are handled the same way, from workoutSessions directly. This
// list is for genuinely new, app-wide milestones with no existing home.
export type AchievementContext = Readonly<{
  questCompletions: ReadonlyArray<QuestCompletion>;
}>;

export type AchievementDefinition = Readonly<{
  id: string;
  title: string;
  description: string;
  xpReward: number;
  target: number;
  unit: string;
  compute: (context: AchievementContext) => number;
}>;

export const ACHIEVEMENT_DEFINITIONS: ReadonlyArray<AchievementDefinition> = [
  {
    id: "quests-completed-100",
    title: "Centurion",
    description: "Completed 100 quests.",
    xpReward: 150,
    target: 100,
    unit: "completions",
    compute: (context) => context.questCompletions.length,
  },
  {
    id: "quests-completed-500",
    title: "Veteran",
    description: "Completed 500 quests.",
    xpReward: 400,
    target: 500,
    unit: "completions",
    compute: (context) => context.questCompletions.length,
  },
  {
    id: "quests-completed-1000",
    title: "Legend",
    description: "Completed 1000 quests.",
    xpReward: 800,
    target: 1000,
    unit: "completions",
    compute: (context) => context.questCompletions.length,
  },
];
