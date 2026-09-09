// An achievement the user records themselves - e.g. "Finished My MSc." -
// distinct from a real Atlas-verified achievement (see
// achievements/achievement-definitions.ts and the "achievement"-typed
// entries in the reward collection, types/reward.ts). Manual achievements
// are real, persisted, user-authored records - not a display preference -
// and are clearly attributable as manual (never presented as something
// Atlas itself verified).
export const MANUAL_ACHIEVEMENT_ICONS = ["trophy", "star", "flame", "medal", "crown", "target", "book", "heart"] as const;
export type ManualAchievementIcon = (typeof MANUAL_ACHIEVEMENT_ICONS)[number];

export type ManualAchievement = Readonly<{
  id: string;
  title: string;
  description?: string;
  icon: ManualAchievementIcon;
  category?: string;
  // When the achievement actually happened, if the user specified one -
  // falls back to createdAt for ordering when absent.
  achievedAt?: string;
  createdAt: string;
  updatedAt: string;
}>;
