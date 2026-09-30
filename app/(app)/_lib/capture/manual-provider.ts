import type { CaptureProvider, CaptureInterpretationRequest, CaptureInterpretation } from "./provider";
import type { CaptureDomain } from "../types/capture";

// The one provider that exists in Phase B: the user says what happened.
//
// It needs no model, no integration and no network, which makes it the
// honest baseline every domain gets for free - and the thing that proves
// the whole pipeline (permission -> provider -> draft -> validation ->
// event -> resolution) end to end before a single inference exists.
//
// Its output is "declared" evidence: not a guess Atlas has to hedge about,
// but the user's own assertion, so it is born confirmed and never asks
// them to re-confirm what they just typed.

export function manualCaptureProviderId(domain: CaptureDomain): string {
  return `manual:${domain}`;
}

const DOMAIN_LABELS: Readonly<Record<CaptureDomain, string>> = {
  nutrition: "Nutrition",
  workout: "Training",
  trading: "Trading",
  career: "Career",
  startup: "Startup",
  chess: "Chess",
  mercor: "Mercor",
  thesis: "Thesis",
  reading: "Reading",
};

export function createManualCaptureProvider(domain: CaptureDomain): CaptureProvider {
  const id = manualCaptureProviderId(domain);

  return {
    id,
    label: `${DOMAIN_LABELS[domain]} — logged by you`,
    domain,
    sourceKind: "manual",
    describes: `Records only what you type in yourself. Reads nothing else.`,
    usesModel: false,
    interpret: async (request: CaptureInterpretationRequest): Promise<CaptureInterpretation> => {
      const text = request.text?.trim();

      // Nothing typed is not a low-confidence capture - it is no capture.
      if (!text) {
        return { drafts: [], note: "Nothing was entered, so nothing was recorded." };
      }

      return {
        drafts: [
          {
            domain,
            kind: "manual_entry",
            source: { kind: "manual", providerId: id },
            occurredAt: request.occurredAt,
            title: text.length > 80 ? `${text.slice(0, 80)}…` : text,
            // Stored verbatim, never rephrased or summarized - the record
            // must stay exactly what the user wrote.
            summary: text,
            evidence: [{ tier: "declared", type: "user_input", label: "Entered by you" }],
            confidence: 1,
            data: request.raw ?? {},
            signature: request.documentId,
          },
        ],
      };
    },
  };
}
