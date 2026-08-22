// Purely derived from calculateQuestConsistency's existing 0-100 rolling
// completion percentage (daily-system.ts) - no storage, same "derive don't
// store" convention as everything else on this page. This is the single
// color/badge/glow language for a quest row's consistency state.
export type ConsistencyTierLabel = "Broken" | "Struggling" | "Building" | "Focused" | "Disciplined" | "Mastered";

export type ConsistencyBadgeIcon = "broken-chain" | "flame" | "brick-stack" | "target" | "star-medal" | "crown-diamond";

export type ConsistencyTier = Readonly<{
  tier: 0 | 1 | 2 | 3 | 4 | 5;
  label: ConsistencyTierLabel;
  textClass: string;
  ringHex: string;
  borderClass: string;
  bgClass: string;
  glowClass: string;
  badgeIcon: ConsistencyBadgeIcon;
  hasParticles: boolean;
}>;

const TIERS: ReadonlyArray<ConsistencyTier> = [
  { tier: 0, label: "Broken", textClass: "text-slate-500", ringHex: "#64748b", borderClass: "border-slate-700", bgClass: "bg-slate-800/40", glowClass: "", badgeIcon: "broken-chain", hasParticles: false },
  { tier: 1, label: "Struggling", textClass: "text-red-400", ringHex: "#f87171", borderClass: "border-red-500/40", bgClass: "bg-red-500/10", glowClass: "shadow-[0_0_14px_rgba(248,113,113,0.18)]", badgeIcon: "flame", hasParticles: false },
  { tier: 2, label: "Building", textClass: "text-amber-300", ringHex: "#fbbf24", borderClass: "border-amber-400/40", bgClass: "bg-amber-400/10", glowClass: "shadow-[0_0_16px_rgba(251,191,36,0.18)]", badgeIcon: "brick-stack", hasParticles: false },
  { tier: 3, label: "Focused", textClass: "text-cyan-300", ringHex: "#22d3ee", borderClass: "border-cyan-400/40", bgClass: "bg-cyan-400/10", glowClass: "shadow-[0_0_18px_rgba(34,211,238,0.2)]", badgeIcon: "target", hasParticles: false },
  { tier: 4, label: "Disciplined", textClass: "text-purple-300", ringHex: "#c084fc", borderClass: "border-purple-400/50", bgClass: "bg-purple-400/10", glowClass: "shadow-[0_0_26px_rgba(192,132,252,0.3)]", badgeIcon: "star-medal", hasParticles: true },
  { tier: 5, label: "Mastered", textClass: "text-emerald-300", ringHex: "#34d399", borderClass: "border-emerald-400/60", bgClass: "bg-emerald-400/10", glowClass: "shadow-[0_0_32px_rgba(52,211,153,0.36)]", badgeIcon: "crown-diamond", hasParticles: true },
];

export function getConsistencyTier(percent: number): ConsistencyTier {
  const clamped = Math.min(100, Math.max(0, percent));

  if (clamped >= 95) return TIERS[5];
  if (clamped >= 80) return TIERS[4];
  if (clamped >= 60) return TIERS[3];
  if (clamped >= 40) return TIERS[2];
  if (clamped >= 20) return TIERS[1];
  return TIERS[0];
}
