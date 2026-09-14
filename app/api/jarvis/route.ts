import { NextResponse, type NextRequest } from "next/server";
import { createAnthropicProvider } from "../../(app)/_lib/jarvis/anthropic-provider";
import { createOllamaProvider, checkOllamaHealth, DEFAULT_OLLAMA_MODEL } from "../../(app)/_lib/jarvis/ollama-provider";
import type { LLMProvider, LLMRequest, LLMResponse } from "../../(app)/_lib/jarvis/types";

// Local JARVIS - JARVIS_PROVIDER selects which LLMProvider backs this
// route; defaults to "anthropic" (unchanged Phase 14-19.5 behavior) so
// nothing breaks for anyone who doesn't set this new var. Ollama needs no
// credential at all - "configured" for it just means the provider was
// selected, not that a secret is present (see GET below for the real
// reachability/model-availability check instead).
function resolveProviderName(): "anthropic" | "ollama" {
  return process.env.JARVIS_PROVIDER === "ollama" ? "ollama" : "anthropic";
}

// Phase 14 - the ONLY server-side piece of JARVIS. A thin, stateless proxy:
// it receives an already-assembled request (system prompt + messages +
// tool definitions, all built client-side from real Atlas data - see
// types.ts's architecture note for why), holds the API key, and forwards
// to the configured LLM provider. It never touches Atlas data, never
// persists anything, and never runs a tool itself.
//
// Mirrors the existing isConfigured-gate pattern already used by
// app/auth/callback/route.ts for Supabase - same shape of graceful
// degradation, just for a different provider.

function isValidRequestBody(body: unknown): body is LLMRequest {
  if (!body || typeof body !== "object") return false;
  const record = body as Record<string, unknown>;
  return typeof record.system === "string" && Array.isArray(record.messages);
}

// Phase 19.7 Objective J - dev-only performance telemetry (route + provider
// latency, tool count, a rough context-size estimate, model/provider
// identity). Gated to non-production so it never runs in a real deployment;
// never logs a key, a tool's arguments, or any Atlas context content - only
// counts/sizes/timings, matching the "no secrets, no full conversation
// contents" requirement.
const TELEMETRY_ENABLED = process.env.NODE_ENV !== "production";

function resolveOllamaNumber(envValue: string | undefined, fallback: number): number {
  const parsed = envValue ? Number(envValue) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// Phase 19.5 - a safe configuration diagnostic (Section 4 of the report):
// reports whether a provider is configured and which one/model, but NEVER
// the key itself, not even a prefix/suffix/length - there is nothing here
// an attacker (or an accidental screenshot) could use to authenticate as
// Atlas. Safe to leave reachable in production for the same reason a
// health-check endpoint is: it answers "is this configured," not "what is
// the secret."
export async function GET(): Promise<NextResponse> {
  const providerName = resolveProviderName();

  if (providerName === "ollama") {
    const model = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;
    const health = await checkOllamaHealth({ baseUrl: process.env.OLLAMA_BASE_URL, model });
    return NextResponse.json({ configured: true, provider: "ollama", model, ollamaReachable: health.reachable, modelAvailable: health.modelAvailable });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  return NextResponse.json({ configured: Boolean(apiKey), provider: "anthropic", model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5" });
}

export async function POST(request: NextRequest): Promise<NextResponse<LLMResponse>> {
  const routeStartedAt = Date.now();
  const providerName = resolveProviderName();

  const logTelemetry = (event: Readonly<{ providerLatencyMs: number; toolCount: number; contextChars: number; model: string; provider: string }>) => {
    if (!TELEMETRY_ENABLED) return;
    console.log("[jarvis:telemetry]", { ...event, routeLatencyMs: Date.now() - routeStartedAt });
  };

  let provider: LLMProvider;
  if (providerName === "ollama") {
    provider = createOllamaProvider({
      baseUrl: process.env.OLLAMA_BASE_URL,
      model: process.env.OLLAMA_MODEL,
      numCtx: resolveOllamaNumber(process.env.OLLAMA_NUM_CTX, 8192),
      numPredict: resolveOllamaNumber(process.env.OLLAMA_NUM_PREDICT, 2048),
      onTelemetry: logTelemetry,
    });
  } else {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Safe to log - confirms only that the var is absent, never a value.
      console.error("[jarvis]", { provider: "anthropic", errorType: "not_configured" });
      return NextResponse.json({ content: [], stopReason: "error", error: { code: "not_configured", message: "JARVIS has no LLM provider configured." } }, { status: 503 });
    }
    provider = createAnthropicProvider({ apiKey, model: process.env.ANTHROPIC_MODEL, onTelemetry: logTelemetry });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ content: [], stopReason: "error", error: { code: "malformed_response", message: "Invalid request body." } }, { status: 400 });
  }

  if (!isValidRequestBody(body)) {
    return NextResponse.json({ content: [], stopReason: "error", error: { code: "malformed_response", message: "Invalid request body." } }, { status: 400 });
  }

  const result = await provider.generateResponse(body);

  return NextResponse.json(result, { status: result.error ? 502 : 200 });
}
