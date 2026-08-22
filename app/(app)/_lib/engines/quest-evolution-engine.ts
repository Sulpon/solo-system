// Purely derived from a Quest's calendar streak (calculateQuestStreak) - no
// storage, same "derive don't store" convention as everything else here.
// Tiers are deliberately restrained (subtle border/glow shifts, not
// confetti-in-the-row) to match the app's dark, sophisticated tone.
export type QuestEvolutionTier = Readonly<{
  tier: 0 | 1 | 2 | 3 | 4;
  label: string;
  borderClass: string;
  glowClass: string;
  badgeTextClass: string;
}>;

const TIERS: ReadonlyArray<QuestEvolutionTier> = [
  { tier: 0, label: "", borderClass: "", glowClass: "", badgeTextClass: "" },
  { tier: 1, label: "Awakened", borderClass: "border-cyan-400/30", glowClass: "", badgeTextClass: "text-cyan-300" },
  { tier: 2, label: "Ascendant", borderClass: "border-purple-400/40", glowClass: "shadow-[0_0_16px_rgba(168,85,247,0.14)]", badgeTextClass: "text-purple-300" },
  { tier: 3, label: "Rare", borderClass: "border-amber-400/40", glowClass: "shadow-[0_0_22px_rgba(251,191,36,0.16)]", badgeTextClass: "text-amber-300" },
  { tier: 4, label: "Legendary", borderClass: "border-amber-300/60", glowClass: "celebration-legendary-glow", badgeTextClass: "text-amber-200" },
];

export function getQuestEvolutionTier(streakDays: number): QuestEvolutionTier {
  if (streakDays >= 100) {
    return TIERS[4];
  }

  if (streakDays >= 50) {
    return TIERS[3];
  }

  if (streakDays >= 30) {
    return TIERS[2];
  }

  if (streakDays >= 10) {
    return TIERS[1];
  }

  return TIERS[0];
}
