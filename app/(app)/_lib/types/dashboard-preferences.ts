// Which Streaks/Achievements/Goals the user has chosen to show on the
// Dashboard's top section - a VIEW preference, never a copy of the real
// data (see engines/dashboard-personalization-engine.ts, which always
// re-derives the actual streak/achievement/goal values live from their
// real source systems). `null` means "not customized yet - compute a
// sensible live default" (see getDefault*Ids below); once the user saves a
// selection (even an empty one) it becomes a real array and is never
// silently overwritten again.
//
// Composite id formats (so the three lists can each mix multiple real
// sources without collisions):
//   streak id:      "quest:<questId>" | "manual-streak:<manualStreakId>"
//   achievement id:  "reward:<unlockedRewardId>" | "manual-achievement:<manualAchievementId>"
//   goal id:         a raw GoalNode id (only one source, no prefix needed)
export type DashboardPreferences = Readonly<{
  selectedStreakIds: ReadonlyArray<string> | null;
  selectedAchievementIds: ReadonlyArray<string> | null;
  selectedGoalIds: ReadonlyArray<string> | null;
  updatedAt: string;
}>;

export function createDefaultDashboardPreferences(): DashboardPreferences {
  return { selectedStreakIds: null, selectedAchievementIds: null, selectedGoalIds: null, updatedAt: new Date().toISOString() };
}
