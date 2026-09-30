import type { CaptureEventDraft } from "./capture-engine";
import type { CaptureDomain, CaptureSourceKind, CaptureData } from "../types/capture";

// The provider boundary. A provider turns some raw input (typed text, an
// imported file, a photo, a device payload) into DRAFTS - never into
// CaptureEvents.
//
// That distinction is the whole point of the interface: only
// createCaptureEvent mints a real CaptureEvent, so the confidence floor,
// the derived evidence tier, and the confirmation rules cannot be bypassed
// by a provider - or by a model writing through one. It mirrors how
// jarvis/actions.ts only ever builds a PROPOSAL and the real mutation
// happens later, behind the user's Confirm.

export type CaptureInterpretationRequest = Readonly<{
  // When the real-world thing happened, as best the caller knows. A
  // provider may override it per draft from stronger evidence (an EXIF
  // timestamp, a statement's trade time).
  occurredAt: string;
  // Free text the user typed, when there is any.
  text?: string;
  // A blob already stored in document-store.ts (IndexedDB). Providers
  // receive the id, not the bytes, so nothing large is passed around and
  // the evidence can point at a real, durable record.
  documentId?: string;
  // Structured payload from a file import or device.
  raw?: CaptureData;
}>;

export type CaptureInterpretation = Readonly<{
  drafts: ReadonlyArray<CaptureEventDraft>;
  // Honest, user-readable note for when a provider produced nothing, or
  // less than the caller might expect ("could not read a timestamp from
  // this file"). Never a substitute for a draft.
  note?: string;
}>;

export type CaptureProvider = Readonly<{
  // Stable id. This is what a permission grant is keyed on
  // (capture-permissions.ts) and what CaptureSource.providerId records, so
  // it must never be renamed once shipped.
  id: string;
  label: string;
  domain: CaptureDomain;
  sourceKind: CaptureSourceKind;
  // One plain sentence shown next to the permission toggle, describing
  // exactly what this provider reads. Required, so no source can be
  // offered without telling the user what it does.
  describes: string;
  // True when the provider sends data to a model. Surfaced in the consent
  // UI, because "Atlas reads a file you picked" and "Atlas asks a model to
  // guess" deserve different answers from the user.
  usesModel: boolean;
  interpret: (request: CaptureInterpretationRequest) => Promise<CaptureInterpretation>;
}>;

// ---- Draft validation -----------------------------------------------------
//
// Hand-written guards, matching the codebase's existing style (there is no
// schema library here - see merge-atlas-snapshot.ts's isIdEntityArray).
// Every draft crossing this boundary is treated as untrusted, because for
// a model-backed provider it literally is model output.

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidCaptureDraft(value: unknown, provider: CaptureProvider): value is CaptureEventDraft {
  if (typeof value !== "object" || value === null) return false;

  const draft = value as Partial<CaptureEventDraft>;

  if (draft.domain !== provider.domain) return false;
  if (!isNonEmptyString(draft.kind) || !isNonEmptyString(draft.title)) return false;
  if (!isNonEmptyString(draft.occurredAt) || Number.isNaN(new Date(draft.occurredAt).getTime())) return false;
  if (typeof draft.confidence !== "number" || !Number.isFinite(draft.confidence)) return false;
  if (!Array.isArray(draft.evidence) || draft.evidence.length === 0) return false;

  if (!draft.evidence.every((item) => typeof item === "object" && item !== null && isNonEmptyString(item.type) && isNonEmptyString(item.label))) {
    return false;
  }

  // A provider may not promote its own output: the source must be its own
  // id, and a model-backed provider may only ever claim "inferred". This
  // is the check that stops a model from labelling its guess as a broker
  // statement to skip the confirmation gate.
  if (!draft.source || draft.source.providerId !== provider.id) return false;
  if (provider.usesModel && !draft.evidence.every((item) => item.tier === "inferred")) return false;

  return true;
}

export function validateCaptureDrafts(interpretation: CaptureInterpretation, provider: CaptureProvider): ReadonlyArray<CaptureEventDraft> {
  return interpretation.drafts.filter((draft) => isValidCaptureDraft(draft, provider));
}

// ---- Registry -------------------------------------------------------------
//
// An explicit list, same convention as ALL_JARVIS_TOOLS - not dynamic
// registration, so "which sources can Atlas read from" is answerable by
// reading one file.

export function findCaptureProvider(providers: ReadonlyArray<CaptureProvider>, id: string): CaptureProvider | null {
  return providers.find((provider) => provider.id === id) ?? null;
}

export function getCaptureProvidersForDomain(providers: ReadonlyArray<CaptureProvider>, domain: CaptureDomain): ReadonlyArray<CaptureProvider> {
  return providers.filter((provider) => provider.domain === domain);
}
