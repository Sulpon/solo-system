// Phase 20 Objective R - development-only AI tracing. A single, typed
// shape for "what did Atlas AI just decide," replacing the ad hoc
// console.debug shape Phase 19.7/19.8 grew inline in
// useJarvisConversation.ts with something atlas-ai.ts can build once and
// any interface (Objective O) can log the same way.
//
// Deliberately excludes anything Objective R prohibits: no API keys, no
// secrets, no full private context, no complete conversation text - only
// counts, names, and decisions (the exact same discipline Phase 19.7's
// provider-level telemetry already established for onTelemetry).

export type AtlasTrace = Readonly<{
  intent: string;
  deterministicBypass: boolean;
  contextSources: ReadonlyArray<string>;
  memoryRetrieved: number;
  toolScope: ReadonlyArray<string>;
  permissionDecisions: ReadonlyArray<Readonly<{ tool: string; allowed: boolean; reason: string }>>;
  provider: string | null;
  model: string | null;
  executionResult: string | null;
}>;

export function logAtlasTrace(trace: AtlasTrace): void {
  if (process.env.NODE_ENV === "production") return;
  console.debug("[atlas:trace]", trace);
}
