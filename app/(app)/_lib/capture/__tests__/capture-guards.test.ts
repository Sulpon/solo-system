import { describe, expect, it } from "vitest";
import { clampConfidence, confidenceBand, explainConfidence, isConfidenceSufficient, strongestEvidenceTier, tierRequiresConfirmation } from "../confidence";
import { authorizeCaptureProvider, grantCapturePermission, isCaptureProviderEnabled, revokeCapturePermission } from "../capture-permissions";
import { isValidCaptureDraft, validateCaptureDrafts } from "../provider";
import type { CaptureProvider } from "../provider";
import { CAPTURE_PROVIDERS, CAPTURE_PROVIDER_IDS } from "../provider-registry";
import { createManualCaptureProvider, manualCaptureProviderId } from "../manual-provider";
import { CAPTURE_DOMAINS } from "../../types/capture";

describe("confidence", () => {
  it("clamps anything that is not a usable number to zero or the nearest bound", () => {
    expect(clampConfidence(Number.NaN)).toBe(0);
    expect(clampConfidence(-3)).toBe(0);
    expect(clampConfidence(42)).toBe(1);
  });

  it("bands confidence for display", () => {
    expect(confidenceBand(0.95)).toBe("high");
    expect(confidenceBand(0.6)).toBe("medium");
    expect(confidenceBand(0.3)).toBe("low");
  });

  it("refuses anything under the floor", () => {
    expect(isConfidenceSufficient(0.24)).toBe(false);
    expect(isConfidenceSufficient(0.25)).toBe(true);
  });

  it("reports no tier at all for no evidence, rather than defaulting to one", () => {
    expect(strongestEvidenceTier([])).toBeNull();
  });

  it("gates on the tier alone, so a confident guess is still a guess", () => {
    expect(tierRequiresConfirmation("inferred")).toBe(true);
    expect(tierRequiresConfirmation("device")).toBe(true);
    expect(tierRequiresConfirmation("declared")).toBe(false);
    expect(tierRequiresConfirmation("direct")).toBe(false);
  });

  it("explains an inference as needing confirmation and never overstates it", () => {
    const explanation = explainConfidence([{ tier: "inferred", type: "photo_guess", label: "Looks like rice" }], 0.9);

    expect(explanation).toContain("Inferred, not observed");
    expect(explanation).toContain("needs your confirmation");
  });

  it("says plainly when there is nothing behind a claim", () => {
    expect(explainConfidence([], 1)).toBe("No supporting evidence.");
  });
});

describe("capture permissions", () => {
  it("denies a source that was never enabled", () => {
    const decision = authorizeCaptureProvider([], "manual:nutrition");

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("never been enabled");
  });

  it("denies an unknown source rather than defaulting to allowed", () => {
    expect(isCaptureProviderEnabled(grantCapturePermission([], "manual:nutrition"), "some-other-source")).toBe(false);
  });

  it("allows a source the user turned on, and stops again when they turn it off", () => {
    const granted = grantCapturePermission([], "manual:nutrition");
    expect(isCaptureProviderEnabled(granted, "manual:nutrition")).toBe(true);

    const revoked = revokeCapturePermission(granted, "manual:nutrition");
    expect(isCaptureProviderEnabled(revoked, "manual:nutrition")).toBe(false);
  });

  it("keeps the revoked row so the UI can say when it was turned off", () => {
    const revoked = revokeCapturePermission(grantCapturePermission([], "manual:nutrition"), "manual:nutrition");

    expect(revoked).toHaveLength(1);
    expect(revoked[0].revokedAt).not.toBeNull();
  });

  it("can be re-granted after a revoke", () => {
    const cycled = grantCapturePermission(revokeCapturePermission(grantCapturePermission([], "manual:chess"), "manual:chess"), "manual:chess");

    expect(isCaptureProviderEnabled(cycled, "manual:chess")).toBe(true);
    expect(cycled).toHaveLength(1);
  });
});

describe("provider registry", () => {
  it("offers exactly one source per domain in this phase, all manual", () => {
    expect(CAPTURE_PROVIDERS).toHaveLength(CAPTURE_DOMAINS.length);
    expect(CAPTURE_PROVIDERS.every((provider) => provider.sourceKind === "manual" && !provider.usesModel)).toBe(true);
  });

  it("gives every provider a unique id and a description of what it reads", () => {
    expect(CAPTURE_PROVIDER_IDS.size).toBe(CAPTURE_PROVIDERS.length);
    expect(CAPTURE_PROVIDERS.every((provider) => provider.describes.trim().length > 0)).toBe(true);
  });
});

describe("manual provider", () => {
  const provider = createManualCaptureProvider("nutrition");

  it("captures nothing when nothing was entered", async () => {
    const result = await provider.interpret({ occurredAt: "2026-09-20T08:00:00.000Z", text: "   " });

    expect(result.drafts).toHaveLength(0);
    expect(result.note).toContain("Nothing was entered");
  });

  it("records what the user wrote verbatim as declared evidence", async () => {
    const result = await provider.interpret({ occurredAt: "2026-09-20T08:00:00.000Z", text: "200g chicken, 150g rice" });

    expect(result.drafts).toHaveLength(1);
    expect(result.drafts[0].summary).toBe("200g chicken, 150g rice");
    expect(result.drafts[0].evidence[0].tier).toBe("declared");
    expect(result.drafts[0].source.providerId).toBe(manualCaptureProviderId("nutrition"));
  });

  it("produces drafts that pass its own validation", async () => {
    const result = await provider.interpret({ occurredAt: "2026-09-20T08:00:00.000Z", text: "200g chicken" });

    expect(validateCaptureDrafts(result, provider)).toHaveLength(1);
  });
});

describe("draft validation", () => {
  const provider = createManualCaptureProvider("nutrition");

  const validDraft = {
    domain: "nutrition" as const,
    kind: "manual_entry",
    source: { kind: "manual" as const, providerId: provider.id },
    occurredAt: "2026-09-20T08:00:00.000Z",
    title: "Lunch",
    evidence: [{ tier: "declared" as const, type: "user_input", label: "Entered by you" }],
    confidence: 1,
  };

  it("rejects a draft claiming a different domain than its provider", () => {
    expect(isValidCaptureDraft({ ...validDraft, domain: "trading" }, provider)).toBe(false);
  });

  it("rejects a draft attributing itself to another source", () => {
    expect(isValidCaptureDraft({ ...validDraft, source: { kind: "manual", providerId: "mt5" } }, provider)).toBe(false);
  });

  it("rejects a draft with no evidence, an unusable date, or a non-numeric confidence", () => {
    expect(isValidCaptureDraft({ ...validDraft, evidence: [] }, provider)).toBe(false);
    expect(isValidCaptureDraft({ ...validDraft, occurredAt: "not a date" }, provider)).toBe(false);
    expect(isValidCaptureDraft({ ...validDraft, confidence: "high" }, provider)).toBe(false);
  });

  it("stops a model-backed provider from dressing its guess up as a stronger tier", () => {
    const modelProvider: CaptureProvider = { ...provider, id: "vision:nutrition", usesModel: true };
    const promoted = { ...validDraft, source: { kind: "photo" as const, providerId: "vision:nutrition" } };

    expect(isValidCaptureDraft(promoted, modelProvider)).toBe(false);
    expect(isValidCaptureDraft({ ...promoted, evidence: [{ tier: "inferred", type: "vision", label: "Looks like rice" }] }, modelProvider)).toBe(true);
  });

  it("drops invalid drafts instead of failing the whole interpretation", () => {
    const mixed = { drafts: [validDraft, { ...validDraft, domain: "chess" as const }] };

    expect(validateCaptureDrafts(mixed, provider)).toHaveLength(1);
  });
});
