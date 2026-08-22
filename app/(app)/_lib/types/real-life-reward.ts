// Entirely user-authored - nothing here is auto-invented or auto-purchased.
// "Unlocked" (streak/goal threshold reached) is computed live from
// linkedQuestId/streakThreshold where set; "redeemed" is set only by the
// user, manually, once they've actually claimed the reward.
export type RealLifeReward = Readonly<{
  id: string;
  title: string;
  description?: string;
  milestone: string;
  linkedQuestId?: string | null;
  streakThreshold?: number;
  estimatedValue?: number;
  redeemed: boolean;
  redeemedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}>;
