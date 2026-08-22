import type { RewardDefinition, RewardRarity } from "../types/reward";

// Curated, developer-defined pool. Purely cosmetic/progression - no
// real-money framing anywhere in this file or its consumers.
export const MYSTERY_REWARD_POOL: ReadonlyArray<RewardDefinition> = [
  { id: "badge-spark", type: "badge", rarity: "common", title: "Spark", description: "A small sign of momentum.", icon: "✦" },
  { id: "badge-steady-hand", type: "badge", rarity: "common", title: "Steady Hand", description: "Consistency, quietly compounding.", icon: "✦" },
  { id: "badge-early-riser", type: "badge", rarity: "common", title: "Early Riser", description: "Showing up before it's easy.", icon: "✦" },
  { id: "title-the-committed", type: "title", rarity: "common", title: "The Committed", icon: "◆" },
  { id: "cosmetic-frame-slate", type: "cosmetic", rarity: "common", title: "Slate Frame", description: "A minimal profile frame.", icon: "▢" },

  { id: "badge-momentum", type: "badge", rarity: "rare", title: "Momentum", description: "Discipline turning into identity.", icon: "✧" },
  { id: "badge-sharp-focus", type: "badge", rarity: "rare", title: "Sharp Focus", description: "Cutting through the noise.", icon: "✧" },
  { id: "title-the-relentless", type: "title", rarity: "rare", title: "The Relentless", icon: "◆" },
  { id: "theme-deep-violet", type: "theme", rarity: "rare", title: "Deep Violet", description: "An alternate accent theme.", icon: "◈" },

  { id: "badge-iron-will", type: "badge", rarity: "epic", title: "Iron Will", description: "Very few make it this far.", icon: "✷" },
  { id: "title-unbroken", type: "title", rarity: "epic", title: "Unbroken", icon: "◆" },
  { id: "theme-crimson-forge", type: "theme", rarity: "epic", title: "Crimson Forge", description: "An alternate accent theme.", icon: "◈" },

  { id: "badge-atlas-ascendant", type: "badge", rarity: "legendary", title: "Atlas Ascendant", description: "A rare mark of mastery.", icon: "✸" },
  { id: "title-the-atlas", type: "title", rarity: "legendary", title: "The Atlas", icon: "◆" },
];

export const RARITY_WEIGHTS: Readonly<Record<RewardRarity, number>> = {
  common: 60,
  rare: 28,
  epic: 10,
  legendary: 2,
};
