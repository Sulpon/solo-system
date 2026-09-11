import { detectFirstMoments, detectConsistencyMoments, detectComebackMoments, detectBreakthroughMoments, detectMomentumMoments, detectMilestoneMoments, type AchievementEngineInput } from "./achievement-pattern-engine";
import type { AchievementMoment } from "./types";

// Phase 12's top-level Achievement Intelligence composition: Existing Data
// -> Detect Pattern -> Evidence (both inside achievement-pattern-engine.ts)
// -> Significance filter -> ranked AchievementMoment[] (this file).
// Deliberately capable of returning an empty array - "no meaningful moment
// right now" is the expected common case, not an edge case to work around
// (Step 15: "the system should be capable of saying nothing").

// Only moments at/above this score are considered "meaningful" - matches
// Step 15's evidence-first rule: low significance produces no moment at
// all, never a watered-down one.
const SIGNIFICANCE_THRESHOLD = 40;

// Bounds how many moments a single evaluation can ever return - Mission
// Control/Notification Center only ever want a handful of the best, and
// this keeps consumers from having to re-sort/re-filter large arrays.
const MAX_MOMENTS = 20;

export type { AchievementEngineInput } from "./achievement-pattern-engine";

// Step 11 - Notification Center integration. Only the highest-significance
// moments are notification-worthy; everything at/above SIGNIFICANCE_THRESHOLD
// but below this bar stays available via Mission Control's "Recently
// Achieved" list without ever generating a notification - "do not notify
// for every achievement."
//
// 55, not a round "70": each detector in achievement-pattern-engine.ts only
// populates the 2-3 significance components it has real evidence for
// (e.g. "first" never touches difficulty/improvement/consistency), so
// different moment types have different achievable ceilings by
// construction - comeback/breakthrough/consistency/milestone can reach the
// 55-69 range at their strongest, while a plain "first" tops out near 45.
// 55 is calibrated to that real ceiling: it's crossable only by the
// evidence-heaviest cases of the "hard-won" pattern types (comeback,
// breakthrough, high-tier consistency/momentum, friction-backed milestone),
// never by a routine completion - see verify-achievement-engine.cjs for the
// worked scores.
const NOTIFIABLE_SIGNIFICANCE_THRESHOLD = 55;
const MAX_NOTIFIABLE_MOMENTS = 2;

export function getNotifiableAchievementMoments(moments: ReadonlyArray<AchievementMoment>): AchievementMoment[] {
  return moments.filter((moment) => moment.significance >= NOTIFIABLE_SIGNIFICANCE_THRESHOLD).slice(0, MAX_NOTIFIABLE_MOMENTS);
}

export function computeAchievementMoments(input: AchievementEngineInput): AchievementMoment[] {
  const candidates = [
    ...detectFirstMoments(input),
    ...detectConsistencyMoments(input),
    ...detectComebackMoments(input),
    ...detectBreakthroughMoments(input),
    ...detectMomentumMoments(input),
    ...detectMilestoneMoments(input),
  ];

  return candidates
    .filter((moment) => moment.significance >= SIGNIFICANCE_THRESHOLD)
    .sort((first, second) => second.significance - first.significance || new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime())
    .slice(0, MAX_MOMENTS);
}
