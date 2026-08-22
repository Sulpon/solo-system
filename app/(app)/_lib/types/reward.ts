export type RewardRarity = "common" | "rare" | "epic" | "legendary";

export type RewardType = "badge" | "title" | "theme" | "quest-evolution" | "cosmetic" | "achievement" | "level-unlock";

export type RewardDefinition = Readonly<{
  id: string;
  type: RewardType;
  rarity: RewardRarity;
  title: string;
  description?: string;
  icon?: string;
}>;

export type UnlockedRewardSource = "streak_milestone" | "mystery_reward" | "achievement" | "level_up";

// One permanent entry in the user's reward collection. Never removed by
// undo - see progression-store.tsx / useProgressionEventSync.ts for why.
export type UnlockedReward = Readonly<{
  id: string;
  unlockedAt: string;
  sourceType: UnlockedRewardSource;
  sourceId?: string;
  reward: RewardDefinition;
}>;
