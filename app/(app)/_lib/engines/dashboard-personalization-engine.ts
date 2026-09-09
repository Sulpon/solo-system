import { calculateQuestStreak } from "../daily-system";
import { flattenGoalTree } from "../goal-tree-storage";
import type { GoalTree } from "../types/goal-tree";
import type { ManualAchievement, ManualAchievementIcon } from "../types/manual-achievement";
import type { ManualStreak } from "../types/manual-streak";
import type { Quest, QuestCompletion } from "../types/quest";
import type { UnlockedReward } from "../types/reward";

// ---------------------------------------------------------------------------
// Streaks - "what is currently on a real, active streak" (CURRENT streak,
// never best/historical - see calculateQuestStreak in daily-system.ts, the
// existing reusable streak engine this reuses rather than re-deriving).
// ---------------------------------------------------------------------------

export type StreakCandidate = Readonly<{
  id: string;
  source: "quest" | "manual";
  sourceId: string;
  title: string;
  currentStreak: number;
}>;

export function getStreakCandidates(quests: ReadonlyArray<Quest>, completions: ReadonlyArray<QuestCompletion>, manualStreaks: ReadonlyArray<ManualStreak>): StreakCandidate[] {
  const questStreaks = quests
    .filter((quest) => quest.status === "active")
    .map((quest): StreakCandidate => ({ id: `quest:${quest.id}`, source: "quest", sourceId: quest.id, title: quest.title, currentStreak: calculateQuestStreak(quest, completions) }))
    // A streak of 0 isn't a streak - nothing to offer for it here.
    .filter((candidate) => candidate.currentStreak > 0);

  const manual = manualStreaks.map(
    (streak): StreakCandidate => ({ id: `manual-streak:${streak.id}`, source: "manual", sourceId: streak.id, title: streak.title, currentStreak: streak.currentStreak }),
  );

  return [...questStreaks, ...manual].sort((first, second) => second.currentStreak - first.currentStreak);
}

// First-time default: the most significant currently-active real streaks.
export function getDefaultSelectedStreakIds(candidates: ReadonlyArray<StreakCandidate>, limit = 4): ReadonlyArray<string> {
  return candidates.slice(0, limit).map((candidate) => candidate.id);
}

// ---------------------------------------------------------------------------
// Achievements - reuses the existing reward collection (types/reward.ts) as
// the real achievement ledger: every entry with reward.type === "achievement"
// already IS a verified Atlas achievement (quest-completion milestones, Goal
// completions, Workout PRs - see useProgressionEventSync.ts), each with a
// real unlockedAt timestamp. Nothing here re-derives or duplicates that
// unlock logic.
// ---------------------------------------------------------------------------

export type AchievementCandidate = Readonly<{
  id: string;
  source: "real" | "manual";
  sourceId: string;
  title: string;
  description?: string;
  icon?: ManualAchievementIcon;
  unlockedAt: string;
}>;

export function getAchievementCandidates(rewardCollection: ReadonlyArray<UnlockedReward>, manualAchievements: ReadonlyArray<ManualAchievement>): AchievementCandidate[] {
  const real = rewardCollection
    .filter((entry) => entry.reward.type === "achievement")
    .map((entry): AchievementCandidate => ({ id: `reward:${entry.id}`, source: "real", sourceId: entry.id, title: entry.reward.title, description: entry.reward.description, unlockedAt: entry.unlockedAt }));

  const manual = manualAchievements.map(
    (achievement): AchievementCandidate => ({
      id: `manual-achievement:${achievement.id}`,
      source: "manual",
      sourceId: achievement.id,
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon,
      unlockedAt: achievement.achievedAt ?? achievement.createdAt,
    }),
  );

  return [...real, ...manual].sort((first, second) => new Date(second.unlockedAt).getTime() - new Date(first.unlockedAt).getTime());
}

// First-time default: recently unlocked first (section 17/23 of the spec).
export function getDefaultSelectedAchievementIds(candidates: ReadonlyArray<AchievementCandidate>, limit = 4): ReadonlyArray<string> {
  return candidates.slice(0, limit).map((candidate) => candidate.id);
}

// ---------------------------------------------------------------------------
// Goal Progress - selectedGoalIds always resolve against the live Goal Tree
// (goal-tree-progress.ts's calculateGoalTree/findGoalNodeView, the same
// pattern QuestLinkedGoals already uses) - nothing here stores a progress
// percentage.
// ---------------------------------------------------------------------------

// First-time default: a few currently-active (in-progress) goals.
export function getDefaultSelectedGoalIds(goalTree: GoalTree, limit = 3): ReadonlyArray<string> {
  const flat = flattenGoalTree(goalTree);
  const inProgress = flat.filter((node) => node.status === "in_progress");
  const pool = inProgress.length > 0 ? inProgress : flat.filter((node) => node.status !== "completed");
  return pool.slice(0, limit).map((node) => node.id);
}
