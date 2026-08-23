import type { CelebrationKind } from "../../_lib/types/celebration";
import type { RewardRarity } from "../../_lib/types/reward";

export function getRarityClasses(rarity: RewardRarity) {
  switch (rarity) {
    case "legendary":
      return { border: "border-amber-400/50", bg: "bg-amber-400/10", text: "text-amber-200", glow: "shadow-[0_0_44px_rgba(251,191,36,0.28)]" };
    case "epic":
      return { border: "border-purple-400/50", bg: "bg-purple-400/10", text: "text-purple-200", glow: "shadow-[0_0_36px_rgba(168,85,247,0.24)]" };
    case "rare":
      return { border: "border-cyan-400/40", bg: "bg-cyan-400/10", text: "text-cyan-200", glow: "shadow-[0_0_28px_rgba(34,211,238,0.2)]" };
    default:
      return { border: "border-slate-500/40", bg: "bg-slate-500/10", text: "text-slate-300", glow: "shadow-[0_0_18px_rgba(100,116,139,0.16)]" };
  }
}

export function getKindAccent(kind: CelebrationKind) {
  switch (kind) {
    case "level_up":
      return { border: "border-purple-400/50", text: "text-purple-200" };
    case "attribute_level_up":
      return { border: "border-cyan-400/40", text: "text-cyan-200" };
    case "challenge_level_up":
      return { border: "border-emerald-400/40", text: "text-emerald-200" };
    case "streak_milestone":
      return { border: "border-orange-400/40", text: "text-orange-200" };
    case "personal_best":
      return { border: "border-emerald-400/40", text: "text-emerald-200" };
    case "achievement":
    case "major_milestone":
      return { border: "border-purple-400/50", text: "text-purple-200" };
    case "quest_mastery_level_up":
    case "quest_mastery_identity_evolution":
      return { border: "border-yellow-400/50", text: "text-yellow-200" };
    case "dungeon_completed":
      return { border: "border-amber-400/40", text: "text-amber-200" };
    case "boss_defeated":
    case "city_conquered":
      return { border: "border-rose-400/50", text: "text-rose-200" };
    case "country_conquered":
      return { border: "border-amber-400/60", text: "text-amber-200" };
    default:
      return { border: "border-slate-600/50", text: "text-slate-200" };
  }
}
