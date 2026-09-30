import { getLocalDayKey } from "../local-day";
import { clampConfidence, isConfidenceSufficient, compareEvidenceTiers, strongestEvidenceTier, tierRequiresConfirmation } from "./confidence";
import type { CaptureActor, CaptureData, CaptureDomain, CaptureEvent, CaptureEvidence, CaptureSource } from "../types/capture";

// The pure Capture Engine: creation, identity/deduplication, and the state
// machine. React-, persistence- and LLM-free, exactly like the existing
// signal/achievement/progression engines it sits beside.

function generateCaptureId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "capture-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

// Stable identity of the underlying real-world occurrence.
//
// When the originating system has its own id (an MT5 ticket, a chess.com
// game id) that id IS the identity - re-importing the same statement then
// collapses onto the existing rows instead of doubling the user's trading
// history. Without one, identity falls back to the exact occurrence time
// plus a caller-supplied signature (e.g. a photo's blob id). Deliberately
// NOT time-bucketed: rounding to the nearest minute would silently merge
// two genuinely different sets logged back to back, and losing real data
// is worse than keeping a near-duplicate the user can delete.
export function buildDedupeKey(
  input: Readonly<{ domain: CaptureDomain; kind: string; source: CaptureSource; occurredAt: string; signature?: string }>,
): string {
  const base = `${input.domain}:${input.kind}:${input.source.providerId}`;

  if (input.source.externalId) {
    return `${base}:ext:${input.source.externalId}`;
  }

  const occurredAtMs = new Date(input.occurredAt).getTime();
  const normalizedTime = Number.isNaN(occurredAtMs) ? input.occurredAt : String(occurredAtMs);
  return `${base}:at:${normalizedTime}:${input.signature ?? ""}`;
}

export type CaptureEventDraft = Readonly<{
  domain: CaptureDomain;
  kind: string;
  source: CaptureSource;
  occurredAt: string;
  title: string;
  summary?: string;
  evidence: ReadonlyArray<CaptureEvidence>;
  confidence: number;
  data?: CaptureData;
  signature?: string;
  capturedAt?: string;
}>;

// Returns null - "Atlas found nothing" - rather than a weak capture, when
// there is no evidence or the confidence floor is not met. Callers must
// handle null by staying silent, never by substituting a default.
export function createCaptureEvent(draft: CaptureEventDraft): CaptureEvent | null {
  const evidenceTier = strongestEvidenceTier(draft.evidence);
  if (!evidenceTier) return null;

  const confidence = clampConfidence(draft.confidence);
  if (!isConfidenceSufficient(confidence)) return null;

  const capturedAt = draft.capturedAt ?? new Date().toISOString();
  const needsConfirmation = tierRequiresConfirmation(evidenceTier);

  // A capture the user authored, or one read verbatim out of an
  // already-approved import, is born confirmed - the human decision
  // already happened. Everything else waits for an explicit gate.
  const bornConfirmedBy: CaptureActor | null = needsConfirmation ? null : evidenceTier === "declared" ? "user_declared" : "deterministic_import";

  return {
    id: generateCaptureId(),
    dedupeKey: buildDedupeKey({ domain: draft.domain, kind: draft.kind, source: draft.source, occurredAt: draft.occurredAt, signature: draft.signature }),
    domain: draft.domain,
    kind: draft.kind,
    source: draft.source,
    occurredAt: draft.occurredAt,
    capturedAt,
    updatedAt: capturedAt,
    title: draft.title,
    summary: draft.summary,
    evidence: draft.evidence,
    evidenceTier,
    confidence,
    status: bornConfirmedBy ? "confirmed" : "pending",
    resolution: bornConfirmedBy ? { action: "confirmed", at: capturedAt, by: bornConfirmedBy } : null,
    data: draft.data ?? {},
  };
}

function sortNewestFirst(events: ReadonlyArray<CaptureEvent>) {
  return [...events].sort((first, second) => new Date(second.occurredAt).getTime() - new Date(first.occurredAt).getTime());
}

// Which of two captures of the SAME occurrence should win. Stronger
// evidence beats weaker; equal evidence resolves to whichever Atlas
// learned about most recently.
function isStrongerCapture(candidate: CaptureEvent, incumbent: CaptureEvent): boolean {
  const tierDelta = compareEvidenceTiers(candidate.evidenceTier, incumbent.evidenceTier);
  if (tierDelta !== 0) return tierDelta > 0;

  return new Date(candidate.capturedAt).getTime() > new Date(incumbent.capturedAt).getTime();
}

function mergeOnto(incumbent: CaptureEvent, candidate: CaptureEvent): CaptureEvent {
  // Two things are never undone by a later capture of the same occurrence:
  //
  // 1. A rejection. The user already said "no, that did not happen" - a
  //    re-import must not resurrect it. This is the deletion-tombstone gap
  //    documented in merge-atlas-snapshot.ts, closed here for captures
  //    specifically, because a resurrected capture could be re-applied and
  //    paid XP for.
  // 2. An application. Once a capture has produced real domain records
  //    (appliedRecordIds), replacing it wholesale would let the same
  //    occurrence be applied a second time.
  if (incumbent.status === "rejected" || (incumbent.appliedRecordIds?.length ?? 0) > 0) {
    return incumbent;
  }

  if (!isStrongerCapture(candidate, incumbent)) {
    return incumbent;
  }

  // The stronger observation supplies the content; the existing row keeps
  // its identity and any confirmation the user already gave, so upgrading
  // evidence never silently re-opens a settled decision.
  return {
    ...candidate,
    id: incumbent.id,
    status: incumbent.status === "confirmed" ? "confirmed" : candidate.status,
    resolution: incumbent.resolution ?? candidate.resolution,
    appliedRecordIds: incumbent.appliedRecordIds,
    updatedAt: candidate.capturedAt,
  };
}

// Idempotent by dedupeKey: adding the same import twice yields the same
// collection. Mirrors addActivityEvents' contract (merge, then sort) but
// keyed on real-world identity rather than a composed display id, and
// deliberately uncapped - silently evicting a user's oldest trades or
// meals to stay under a limit would be data loss, not housekeeping.
export function addCaptureEvents(current: ReadonlyArray<CaptureEvent>, nextEvents: ReadonlyArray<CaptureEvent>): CaptureEvent[] {
  const byDedupeKey = new Map<string, CaptureEvent>();

  for (const event of current) {
    byDedupeKey.set(event.dedupeKey, event);
  }

  for (const event of nextEvents) {
    const incumbent = byDedupeKey.get(event.dedupeKey);
    byDedupeKey.set(event.dedupeKey, incumbent ? mergeOnto(incumbent, event) : event);
  }

  return sortNewestFirst(Array.from(byDedupeKey.values()));
}

// ---- State machine --------------------------------------------------------

// Only a pending capture can be resolved, and only once. Resolving
// anything else is a no-op that returns the SAME array reference, so an
// accidental double-click, a replayed action, or two devices confirming
// the same row can never produce two resolutions (and, downstream, two XP
// awards).
export function resolveCaptureEvent(
  events: ReadonlyArray<CaptureEvent>,
  id: string,
  resolution: Readonly<{ action: "confirmed" | "rejected"; by: CaptureActor; note?: string; at?: string }>,
): ReadonlyArray<CaptureEvent> {
  const target = events.find((event) => event.id === id);
  if (!target || target.status !== "pending") {
    return events;
  }

  const at = resolution.at ?? new Date().toISOString();

  return events.map((event) =>
    event.id === id
      ? {
          ...event,
          status: resolution.action === "confirmed" ? ("confirmed" as const) : ("rejected" as const),
          resolution: { action: resolution.action, at, by: resolution.by, note: resolution.note },
          updatedAt: at,
        }
      : event,
  );
}

export function supersedeCaptureEvent(events: ReadonlyArray<CaptureEvent>, id: string, supersededBy: string, at = new Date().toISOString()): ReadonlyArray<CaptureEvent> {
  const target = events.find((event) => event.id === id);
  if (!target || target.status === "superseded") {
    return events;
  }

  return events.map((event) => (event.id === id ? { ...event, status: "superseded" as const, supersededBy, updatedAt: at } : event));
}

// The single write that makes "no duplicate XP" structural rather than a
// convention every adapter has to remember. Phase C+ adapters must call
// canApplyCapture first, write their domain records through the existing
// engine for that domain, then record the ids here.
export function markCaptureApplied(events: ReadonlyArray<CaptureEvent>, id: string, recordIds: ReadonlyArray<string>, at = new Date().toISOString()): ReadonlyArray<CaptureEvent> {
  const target = events.find((event) => event.id === id);
  if (!target || recordIds.length === 0) {
    return events;
  }

  return events.map((event) =>
    event.id === id ? { ...event, appliedRecordIds: Array.from(new Set([...(event.appliedRecordIds ?? []), ...recordIds])), updatedAt: at } : event,
  );
}

// The gate every downstream effect (domain record, XP, achievement) must
// pass through. A pending capture is not history, and an already-applied
// one must never be applied again.
export function canApplyCapture(event: CaptureEvent): boolean {
  return event.status === "confirmed" && (event.appliedRecordIds?.length ?? 0) === 0;
}

// ---- Selectors ------------------------------------------------------------

export function getCaptureEvents(events: ReadonlyArray<CaptureEvent>): CaptureEvent[] {
  return sortNewestFirst(events);
}

export function getPendingCaptures(events: ReadonlyArray<CaptureEvent>): CaptureEvent[] {
  return getCaptureEvents(events).filter((event) => event.status === "pending");
}

export function getConfirmedCaptures(events: ReadonlyArray<CaptureEvent>): CaptureEvent[] {
  return getCaptureEvents(events).filter((event) => event.status === "confirmed");
}

export function getApplicableCaptures(events: ReadonlyArray<CaptureEvent>): CaptureEvent[] {
  return getCaptureEvents(events).filter(canApplyCapture);
}

export function getCapturesByDomain(events: ReadonlyArray<CaptureEvent>, domain: CaptureDomain): CaptureEvent[] {
  return getCaptureEvents(events).filter((event) => event.domain === domain);
}

export function getCapturesByDay(events: ReadonlyArray<CaptureEvent>, dateKey: string): CaptureEvent[] {
  return getCaptureEvents(events).filter((event) => getLocalDayKey(event.occurredAt) === dateKey);
}
