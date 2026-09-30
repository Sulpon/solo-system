import type { CaptureEvidence, EvidenceTier } from "../types/capture";
import { EVIDENCE_TIERS_WEAKEST_FIRST } from "../types/capture";

// The evidence/confidence rules for Automatic Life Capture, in one pure,
// testable place so no adapter can quietly invent its own trust policy.

export type ConfidenceBand = "low" | "medium" | "high";

export const CONFIDENCE_BAND_THRESHOLDS = { high: 0.8, medium: 0.5 } as const;

// Below this, Atlas produces NO capture rather than a weak one. Same rule
// the existing signal and achievement-moment engines already follow:
// "insufficient data means no signal, not a weak/fabricated one." A caller
// that cannot clear this floor has found nothing, and should say nothing.
export const MIN_CAPTURE_CONFIDENCE = 0.25;

export function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function confidenceBand(confidence: number): ConfidenceBand {
  const clamped = clampConfidence(confidence);
  if (clamped >= CONFIDENCE_BAND_THRESHOLDS.high) return "high";
  if (clamped >= CONFIDENCE_BAND_THRESHOLDS.medium) return "medium";
  return "low";
}

export function isConfidenceSufficient(confidence: number): boolean {
  return clampConfidence(confidence) >= MIN_CAPTURE_CONFIDENCE;
}

export function compareEvidenceTiers(first: EvidenceTier, second: EvidenceTier): number {
  return EVIDENCE_TIERS_WEAKEST_FIRST.indexOf(first) - EVIDENCE_TIERS_WEAKEST_FIRST.indexOf(second);
}

// An event is asserted by its BEST evidence - additional weaker
// corroboration alongside a broker statement does not make the trade less
// real. Returns null for no evidence, which callers must treat as "there
// is no capture here," never as a default tier.
export function strongestEvidenceTier(evidence: ReadonlyArray<CaptureEvidence>): EvidenceTier | null {
  if (evidence.length === 0) return null;

  return evidence.reduce<EvidenceTier>((strongest, item) => (compareEvidenceTiers(item.tier, strongest) > 0 ? item.tier : strongest), evidence[0].tier);
}

// Whether a human must approve this before it can become real Atlas
// history.
//
// Deliberately a function of the TIER ALONE, never of confidence: a model
// reporting 0.99 on a guess is still a guess, and letting a high enough
// number skip the gate is exactly the "model bypasses confirmation"
// failure this feature must not have. Confidence orders and explains
// captures; it never authorizes them.
export function tierRequiresConfirmation(tier: EvidenceTier): boolean {
  return tier === "inferred" || tier === "device";
}

// A plain sentence built only from facts already present on the event -
// counts and tiers, never a generated narrative. Used wherever a capture
// is shown, so the user always sees WHY Atlas believes something.
export function explainConfidence(evidence: ReadonlyArray<CaptureEvidence>, confidence: number): string {
  const tier = strongestEvidenceTier(evidence);
  if (!tier) return "No supporting evidence.";

  const count = evidence.length;
  const sources = `${count} piece${count === 1 ? "" : "s"} of evidence`;
  const band = confidenceBand(confidence);

  const tierLabel: Readonly<Record<EvidenceTier, string>> = {
    direct: "Read directly from an authoritative record",
    declared: "Stated by you",
    device: "Reported by a device or app",
    inferred: "Inferred, not observed",
  };

  return `${tierLabel[tier]} · ${sources} · ${band} confidence${tierRequiresConfirmation(tier) ? " · needs your confirmation" : ""}`;
}
