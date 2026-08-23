import type { RewardDefinition } from "./reward";

// small = toast, medium = inline card, major = full-screen modal,
// legendary = full-screen modal with the strongest treatment (used for the
// Mystery Reward roulette and rank-transition level-ups).
export type CelebrationIntensity = "small" | "medium" | "major" | "legendary";

export type CelebrationKind =
  | "quest_completed"
  | "xp_gained"
  | "challenge_level_up"
  | "attribute_level_up"
  | "level_up"
  | "streak_milestone"
  | "mystery_reward"
  | "achievement"
  | "personal_best"
  | "major_milestone"
  | "quest_mastery_level_up"
  | "quest_mastery_identity_evolution";

export type CelebrationPayload = Readonly<{
  id: string;
  kind: CelebrationKind;
  intensity: CelebrationIntensity;
  title: string;
  description?: string;
  xpGained?: number;
  fromValue?: number | string;
  toValue?: number | string;
  reward?: RewardDefinition;
  createdAt: string;
}>;
