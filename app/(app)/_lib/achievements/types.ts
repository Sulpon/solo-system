import type { RelatedEntityGroup } from "../relationships";

// Phase 12's Achievement Intelligence - shared types for the deterministic
// Detection -> Evidence -> Significance -> Moment pipeline. Distinct from
// _lib/types/achievement.ts (the existing threshold-badge Achievement type,
// e.g. "Centurion" at 100 quest completions) - this module doesn't award
// badges, it explains WHY something the user already did was meaningful,
// using real evidence. Also distinct from the ephemeral Celebration system
// (celebration-store.tsx, in-memory toasts with no evidence) - an
// AchievementMoment is a persisted-identity, evidence-rich explanation, a
// different surface entirely, not a replacement.

export type AchievementMomentType = "first" | "consistency" | "comeback" | "breakthrough" | "momentum" | "milestone";

// Every piece of evidence must be traceable to a real Atlas record
// (sourceId names the record - a QuestCompletion id, FocusHistoryEntry id,
// ActivityEvent id, or entity id). Never synthesized text with no backing
// record.
export type AchievementEvidence = Readonly<{
  type: string;
  sourceId: string;
  label: string;
  value?: string;
}>;

export type AchievementMoment = Readonly<{
  id: string;
  type: AchievementMomentType;
  title: string;
  subtitle?: string;
  explanation: string;
  evidence: ReadonlyArray<AchievementEvidence>;
  // 0-100, see achievement-moment-engine.ts's scoreSignificance - only
  // moments at/above SIGNIFICANCE_THRESHOLD are ever returned to a caller;
  // "insufficient evidence" is a valid outcome (no moment), never a weak one.
  significance: number;
  // 0-1: how much real data backs this moment (sample size/history depth).
  confidence: number;
  // Flat id set - internal use (testing, "does this moment touch entity X")
  // - never rendered directly. UI rendering uses relatedGroups instead,
  // which are the exact groups getGoalRelationships/getQuestRelationships
  // already return (title/href/meta), so the "Related" section can reuse
  // RelatedEntitiesPanel verbatim instead of re-resolving ids.
  relatedEntityIds: ReadonlyArray<string>;
  relatedGroups: ReadonlyArray<RelatedEntityGroup>;
  xpAwarded?: number;
  timestamp: string;
}>;
