import { CAPTURE_DOMAINS } from "../types/capture";
import { createManualCaptureProvider } from "./manual-provider";
import type { CaptureProvider } from "./provider";

// Every capture source Atlas knows about, in one readable list - the same
// convention as ALL_JARVIS_TOOLS. Nothing registers itself at runtime, so
// "what can Atlas observe?" is answered by reading this file, and a
// permission UI can enumerate sources without guessing.
//
// Phase B ships exactly one source per domain: the user typing it in.
// Photo, file-import and integration providers are added here as their
// phases land, each arriving switched OFF (capture-permissions.ts is
// default-deny), so adding a source can never start capturing on its own.
export const CAPTURE_PROVIDERS: ReadonlyArray<CaptureProvider> = CAPTURE_DOMAINS.map(createManualCaptureProvider);

export const CAPTURE_PROVIDER_IDS: ReadonlySet<string> = new Set(CAPTURE_PROVIDERS.map((provider) => provider.id));
