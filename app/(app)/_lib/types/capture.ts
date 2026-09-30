import type { ActivityEventMetadata } from "./activity-event";

// Automatic Life Capture - the shared model for "Atlas observed something
// that MIGHT have happened," as distinct from "something definitely
// happened."
//
// Audit finding (Phase A): ActivityEvent is NOT this, and deliberately is
// not reused here. Every ActivityEvent constructor in activity-events.ts is
// called AFTER a system already committed an outcome
// (createQuestActivityEvents(quest, completion, ...)), it carries no
// confidence/evidence/provenance/confirmation state, and the collection is
// capped at MAX_ACTIVITY_EVENTS with eviction. Routing raw captures through
// it would evict real history, fire the Notification Center and Chronicle
// on unconfirmed guesses, and erase the one distinction this whole feature
// exists to protect: uncertain inference vs. confirmed achievement.
//
// The flow is therefore one-directional and never both:
//   CaptureEvent (pending) -> user/deterministic resolution -> domain record
//   written through the EXISTING engine for that domain -> that engine's
//   existing ActivityEvent/XpEvent.
// A CaptureEvent never awards XP itself and never writes an ActivityEvent.

// Only the domains the product brief names explicitly. Deliberately not
// padded out to a round number with invented domains - each remaining
// domain is a one-word addition to this union at the moment its adapter is
// actually built (Phase E), which is additive and breaks nothing.
export type CaptureDomain =
  | "nutrition"
  | "workout"
  | "trading"
  | "career"
  | "startup"
  | "chess"
  | "mercor"
  | "thesis"
  | "reading";

export const CAPTURE_DOMAINS: ReadonlyArray<CaptureDomain> = ["nutrition", "workout", "trading", "career", "startup", "chess", "mercor", "thesis", "reading"];

// How the observation physically reached Atlas. Distinct from EvidenceTier
// below: this is the transport, that is how much the claim can be trusted.
// A photo can produce either a `declared` capture (the user typed what it
// was) or an `inferred` one (a model guessed) - same source kind, very
// different trust.
export type CaptureSourceKind = "manual" | "file_import" | "photo" | "device" | "integration";

export const CAPTURE_SOURCE_KINDS: ReadonlyArray<CaptureSourceKind> = ["manual", "file_import", "photo", "device", "integration"];

export type CaptureSource = Readonly<{
  kind: CaptureSourceKind;
  // The registered CaptureProvider that produced this event (see
  // capture/provider.ts). Always a real registered id - never free text,
  // so provenance stays traceable and a provider can be revoked.
  providerId: string;
  // The id this record has in the ORIGINATING system (an MT5 ticket
  // number, a chess.com game id, a file name + row). Present whenever the
  // source has one; it is what makes re-importing the same export
  // idempotent rather than duplicating history. See buildDedupeKey.
  externalId?: string;
}>;

// How much the claim can be trusted, ordered weakest to strongest below.
//
// - "inferred"  a model or heuristic guessed it. Never self-confirming.
// - "device"    a sensor/app reported it. Real telemetry, but it can still
//               be measuring the wrong thing (a phone in a pocket is not
//               proof of a workout), so it is still confirmation-gated.
// - "declared"  the user stated it themselves. Not a guess at all - it IS
//               the user's own assertion, so re-asking them to confirm
//               what they just typed is pure friction, not safety.
// - "direct"    an authoritative record Atlas ingested verbatim (a broker
//               statement, an exported game history). The human decision
//               happens once, when the import itself is approved.
export type EvidenceTier = "inferred" | "device" | "declared" | "direct";

export const EVIDENCE_TIERS_WEAKEST_FIRST: ReadonlyArray<EvidenceTier> = ["inferred", "device", "declared", "direct"];

// One traceable fact backing the event. Modelled on the existing, proven
// AchievementEvidence shape (achievements/types.ts) rather than a second
// evidence vocabulary: a label a human can read, plus a pointer to the real
// record it came from. Never synthesized prose with no backing record.
export type CaptureEvidence = Readonly<{
  tier: EvidenceTier;
  // Short machine-ish discriminator, e.g. "broker_statement_row",
  // "photo_exif_time", "user_input". Free-form by design (each domain
  // knows its own evidence kinds) but never user-facing on its own.
  type: string;
  label: string;
  value?: string;
  // The real Atlas record this evidence points at, when one exists: a
  // document-store blob id, a WorkoutSession id, an imported row id.
  // Absent when the evidence is the user's own typed input.
  sourceId?: string;
}>;

export type CaptureStatus = "pending" | "confirmed" | "rejected" | "superseded";

// Who resolved the event. "user" is an explicit click on a confirmation
// gate. "user_declared" means the user authored the content itself, so the
// capture was born confirmed. "deterministic_import" means an
// already-approved import of an authoritative source produced it - the
// human approval happened at the import, not per row.
export type CaptureActor = "user" | "user_declared" | "deterministic_import";

export type CaptureResolution = Readonly<{
  action: "confirmed" | "rejected";
  at: string;
  by: CaptureActor;
  note?: string;
}>;

// The domain-specific payload (grams of protein, trade P/L, reps). Reuses
// the existing JSON-safe metadata shape rather than declaring a second
// identical recursive union - same reason merge-atlas-snapshot.ts refuses
// to keep its own list of collection keys.
export type CaptureData = ActivityEventMetadata;

export type CaptureEvent = Readonly<{
  id: string;
  // Stable identity of the underlying real-world occurrence, independent
  // of `id`. Two captures of the same occurrence share this and are
  // collapsed by the engine - the guard against a re-imported broker
  // statement doubling someone's trading history. See buildDedupeKey.
  dedupeKey: string;
  domain: CaptureDomain;
  // Domain-specific record type, e.g. "meal" | "trade" | "game". Typed per
  // adapter in Phase C+; a plain string here so the shared model does not
  // have to enumerate every domain's vocabulary up front.
  kind: string;
  source: CaptureSource;
  // When the real-world thing happened.
  occurredAt: string;
  // When Atlas learned about it. Differs from occurredAt for any import.
  capturedAt: string;
  // Sync convention: merge-atlas-snapshot.ts merges any menace-* array of
  // {id} objects by id, preferring the newer `updatedAt` on collision.
  updatedAt: string;
  title: string;
  summary?: string;
  evidence: ReadonlyArray<CaptureEvidence>;
  // The strongest tier among `evidence`. An event is asserted by its best
  // evidence; weaker corroboration alongside it does not make the claim
  // less true. Always derived (see capture-engine.ts), never passed in.
  evidenceTier: EvidenceTier;
  // 0-1: how much real data backs this, same meaning and the same honesty
  // rule as PersonalSignal.confidence and AchievementMoment.confidence -
  // insufficient data means no capture at all, never a fabricated low one.
  confidence: number;
  status: CaptureStatus;
  resolution: CaptureResolution | null;
  data: CaptureData;
  // Set when a later, stronger capture replaced this one.
  supersededBy?: string;
  // Ids of the real domain records this capture has already been applied
  // to (a WorkoutSession id, an XpEvent id). Written by Phase C+ adapters.
  // Present from the start because it is the structural guard against
  // applying - and paying XP for - the same capture twice; adding it later
  // would need a migration.
  appliedRecordIds?: ReadonlyArray<string>;
}>;
