import { describe, expect, it } from "vitest";
import {
  addCaptureEvents,
  buildDedupeKey,
  canApplyCapture,
  createCaptureEvent,
  getApplicableCaptures,
  getCapturesByDomain,
  getPendingCaptures,
  markCaptureApplied,
  resolveCaptureEvent,
  supersedeCaptureEvent,
} from "../capture-engine";
import type { CaptureEventDraft } from "../capture-engine";
import type { CaptureEvent, CaptureEvidence } from "../../types/capture";

const OCCURRED_AT = "2026-09-20T08:30:00.000Z";

function draft(overrides: Partial<CaptureEventDraft> = {}): CaptureEventDraft {
  return {
    domain: "nutrition",
    kind: "meal",
    source: { kind: "manual", providerId: "manual:nutrition" },
    occurredAt: OCCURRED_AT,
    title: "Chicken and rice",
    evidence: [{ tier: "declared", type: "user_input", label: "Entered by you" }],
    confidence: 1,
    ...overrides,
  };
}

function event(overrides: Partial<CaptureEventDraft> = {}): CaptureEvent {
  const created = createCaptureEvent(draft(overrides));
  if (!created) throw new Error("expected the draft to produce a capture");
  return created;
}

describe("createCaptureEvent", () => {
  it("refuses to create anything when there is no evidence", () => {
    expect(createCaptureEvent(draft({ evidence: [] }))).toBeNull();
  });

  it("refuses to create a capture below the confidence floor instead of recording a weak one", () => {
    const inferred: ReadonlyArray<CaptureEvidence> = [{ tier: "inferred", type: "photo_guess", label: "Looks like rice" }];
    expect(createCaptureEvent(draft({ evidence: inferred, confidence: 0.1 }))).toBeNull();
  });

  it("derives the tier from the strongest evidence, not the first or the weakest", () => {
    const mixed: ReadonlyArray<CaptureEvidence> = [
      { tier: "inferred", type: "photo_guess", label: "Looks like rice" },
      { tier: "direct", type: "statement_row", label: "Row 12" },
      { tier: "device", type: "app_report", label: "Reported by app" },
    ];

    expect(event({ evidence: mixed }).evidenceTier).toBe("direct");
  });

  it("leaves an inferred capture pending, however confident the model claims to be", () => {
    const created = event({ evidence: [{ tier: "inferred", type: "photo_guess", label: "Looks like rice" }], confidence: 0.99 });

    expect(created.status).toBe("pending");
    expect(created.resolution).toBeNull();
    expect(canApplyCapture(created)).toBe(false);
  });

  it("leaves a device-reported capture pending too", () => {
    expect(event({ evidence: [{ tier: "device", type: "app_report", label: "Health app" }], confidence: 0.9 }).status).toBe("pending");
  });

  it("treats what the user typed as already confirmed rather than re-asking them", () => {
    const created = event();

    expect(created.status).toBe("confirmed");
    expect(created.resolution?.by).toBe("user_declared");
    expect(canApplyCapture(created)).toBe(true);
  });

  it("treats a row read out of an approved import as confirmed by that import", () => {
    const created = event({ evidence: [{ tier: "direct", type: "statement_row", label: "Row 12" }] });

    expect(created.resolution?.by).toBe("deterministic_import");
  });
});

describe("buildDedupeKey", () => {
  it("uses the originating system's id when there is one, ignoring when Atlas saw it", () => {
    const withExternalId = { domain: "trading" as const, kind: "trade", source: { kind: "file_import" as const, providerId: "mt5", externalId: "ticket-8812" }, occurredAt: OCCURRED_AT };

    expect(buildDedupeKey(withExternalId)).toBe(buildDedupeKey({ ...withExternalId, occurredAt: "2026-01-01T00:00:00.000Z" }));
  });

  it("does not collapse two different occurrences of the same kind", () => {
    const base = { domain: "nutrition" as const, kind: "meal", source: { kind: "manual" as const, providerId: "manual:nutrition" } };

    expect(buildDedupeKey({ ...base, occurredAt: OCCURRED_AT })).not.toBe(buildDedupeKey({ ...base, occurredAt: "2026-09-20T12:00:00.000Z" }));
  });

  it("treats the same instant written differently as one occurrence", () => {
    const base = { domain: "nutrition" as const, kind: "meal", source: { kind: "manual" as const, providerId: "manual:nutrition" } };

    expect(buildDedupeKey({ ...base, occurredAt: "2026-09-20T08:30:00.000Z" })).toBe(buildDedupeKey({ ...base, occurredAt: "2026-09-20T08:30:00Z" }));
  });
});

describe("addCaptureEvents", () => {
  it("is idempotent — re-importing the same occurrence does not double history", () => {
    const first = event({ source: { kind: "file_import", providerId: "mt5", externalId: "ticket-1" }, domain: "trading", kind: "trade" });
    const second = event({ source: { kind: "file_import", providerId: "mt5", externalId: "ticket-1" }, domain: "trading", kind: "trade" });

    const merged = addCaptureEvents(addCaptureEvents([], [first]), [second]);

    expect(merged).toHaveLength(1);
  });

  it("upgrades a pending inference when stronger evidence arrives for the same occurrence", () => {
    const inferred = event({ evidence: [{ tier: "inferred", type: "photo_guess", label: "Looks like rice" }], confidence: 0.6, capturedAt: "2026-09-20T09:00:00.000Z" });
    const declared = event({ capturedAt: "2026-09-20T09:05:00.000Z", title: "Chicken, rice, 180g" });

    const [merged] = addCaptureEvents([inferred], [declared]);

    expect(merged.id).toBe(inferred.id);
    expect(merged.evidenceTier).toBe("declared");
    expect(merged.title).toBe("Chicken, rice, 180g");
    expect(merged.status).toBe("confirmed");
  });

  it("does not let weaker evidence overwrite a stronger existing capture", () => {
    const declared = event({ capturedAt: "2026-09-20T09:00:00.000Z" });
    const inferred = event({ evidence: [{ tier: "inferred", type: "photo_guess", label: "Looks like rice" }], confidence: 0.6, capturedAt: "2026-09-20T10:00:00.000Z", title: "Guessed" });

    expect(addCaptureEvents([declared], [inferred])[0].title).toBe(declared.title);
  });

  it("never resurrects something the user rejected", () => {
    const pending = event({ evidence: [{ tier: "inferred", type: "photo_guess", label: "Looks like rice" }], confidence: 0.6 });
    const [rejected] = resolveCaptureEvent([pending], pending.id, { action: "rejected", by: "user" });

    const merged = addCaptureEvents([rejected], [event({ title: "Same meal, re-imported" })]);

    expect(merged).toHaveLength(1);
    expect(merged[0].status).toBe("rejected");
  });

  it("never replaces a capture that has already been applied to real records", () => {
    const original = event();
    const stored = addCaptureEvents([], markCaptureApplied([original], original.id, ["workout-1"]));
    const sameOccurrence = event({ title: "Re-imported" });

    // Same dedupeKey (same domain/kind/provider/time), different row id.
    const merged = addCaptureEvents(stored, [sameOccurrence]);

    expect(merged).toHaveLength(1);
    expect(merged[0].appliedRecordIds).toEqual(["workout-1"]);
  });

  it("sorts by when things actually happened, newest first", () => {
    const older = event({ occurredAt: "2026-09-20T06:00:00.000Z" });
    const newer = event({ occurredAt: "2026-09-20T20:00:00.000Z" });

    expect(addCaptureEvents([], [older, newer]).map((item) => item.occurredAt)).toEqual([newer.occurredAt, older.occurredAt]);
  });
});

describe("resolveCaptureEvent", () => {
  const pending = () => event({ evidence: [{ tier: "inferred", type: "photo_guess", label: "Looks like rice" }], confidence: 0.6 });

  it("confirms a pending capture and records who decided", () => {
    const target = pending();
    const [resolved] = resolveCaptureEvent([target], target.id, { action: "confirmed", by: "user", note: "yes, that was lunch" });

    expect(resolved.status).toBe("confirmed");
    expect(resolved.resolution).toMatchObject({ action: "confirmed", by: "user", note: "yes, that was lunch" });
    expect(canApplyCapture(resolved)).toBe(true);
  });

  it("is a no-op on an already-resolved capture, so a double-click cannot resolve twice", () => {
    const target = pending();
    const once = resolveCaptureEvent([target], target.id, { action: "confirmed", by: "user" });
    const twice = resolveCaptureEvent(once, target.id, { action: "rejected", by: "user" });

    expect(twice).toBe(once);
    expect(twice[0].status).toBe("confirmed");
  });

  it("is a no-op for an unknown id", () => {
    const events = [pending()];
    expect(resolveCaptureEvent(events, "does-not-exist", { action: "confirmed", by: "user" })).toBe(events);
  });
});

describe("markCaptureApplied / canApplyCapture", () => {
  it("closes the gate once a capture has produced real records", () => {
    const confirmed = event();
    const [applied] = markCaptureApplied([confirmed], confirmed.id, ["session-1"]);

    expect(canApplyCapture(applied)).toBe(false);
  });

  it("does not duplicate record ids when the same application is recorded twice", () => {
    const confirmed = event();
    const once = markCaptureApplied([confirmed], confirmed.id, ["session-1"]);
    const [twice] = markCaptureApplied(once, confirmed.id, ["session-1", "session-2"]);

    expect(twice.appliedRecordIds).toEqual(["session-1", "session-2"]);
  });

  it("excludes pending and already-applied captures from the applicable set", () => {
    const confirmed = event();
    const pending = event({ occurredAt: "2026-09-19T08:00:00.000Z", evidence: [{ tier: "inferred", type: "photo_guess", label: "Guess" }], confidence: 0.6 });
    const applied = event({ occurredAt: "2026-09-18T08:00:00.000Z" });

    const all = addCaptureEvents([], [confirmed, pending, applied]);
    const withApplied = markCaptureApplied(all, applied.id, ["record-1"]);

    expect(getApplicableCaptures(withApplied).map((item) => item.id)).toEqual([confirmed.id]);
    expect(getPendingCaptures(withApplied).map((item) => item.id)).toEqual([pending.id]);
  });
});

describe("supersedeCaptureEvent", () => {
  it("marks the old capture superseded and points at its replacement", () => {
    const target = event();
    const [superseded] = supersedeCaptureEvent([target], target.id, "capture-2");

    expect(superseded.status).toBe("superseded");
    expect(superseded.supersededBy).toBe("capture-2");
  });

  it("is a no-op when already superseded", () => {
    const target = event();
    const once = supersedeCaptureEvent([target], target.id, "capture-2");

    expect(supersedeCaptureEvent(once, target.id, "capture-3")).toBe(once);
  });
});

describe("selectors", () => {
  it("filters by domain", () => {
    const meal = event();
    const trade = event({ domain: "trading", kind: "trade", source: { kind: "file_import", providerId: "mt5", externalId: "t-1" } });

    expect(getCapturesByDomain(addCaptureEvents([], [meal, trade]), "trading").map((item) => item.id)).toEqual([trade.id]);
  });
});
