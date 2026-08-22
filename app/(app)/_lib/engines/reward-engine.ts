import { MYSTERY_REWARD_POOL, RARITY_WEIGHTS } from "../rewards/mystery-reward-pool";
import type { RewardDefinition, RewardRarity } from "../types/reward";

function pickRarity(randomValue: number): RewardRarity {
  const total = Object.values(RARITY_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  let cursor = randomValue * total;

  for (const rarity of Object.keys(RARITY_WEIGHTS) as RewardRarity[]) {
    cursor -= RARITY_WEIGHTS[rarity];

    if (cursor <= 0) {
      return rarity;
    }
  }

  return "common";
}

// Weighted-random pick, preferring rewards the user hasn't unlocked yet.
// Only falls back to a duplicate once every reward in the rolled rarity
// tier is already collected ("prevent duplicates unless intentionally
// supported").
export function rollMysteryReward(alreadyUnlockedIds: ReadonlySet<string>, random: () => number = Math.random): RewardDefinition {
  const rarity = pickRarity(random());
  const tier = MYSTERY_REWARD_POOL.filter((reward) => reward.rarity === rarity);
  const fresh = tier.filter((reward) => !alreadyUnlockedIds.has(reward.id));
  const pool = fresh.length > 0 ? fresh : tier.length > 0 ? tier : MYSTERY_REWARD_POOL;
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));

  return pool[index];
}
