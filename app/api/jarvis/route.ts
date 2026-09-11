import { NextResponse, type NextRequest } from "next/server";
import { createAnthropicProvider } from "../../(app)/_lib/jarvis/anthropic-provider";
import type { LLMRequest, LLMResponse } from "../../(app)/_lib/jarvis/types";

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

export async function POST(request: NextRequest): Promise<NextResponse<LLMResponse>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ content: [], stopReason: "error", error: { code: "not_configured", message: "JARVIS has no LLM provider configured." } }, { status: 503 });
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

  const provider = createAnthropicProvider({ apiKey, model: process.env.ANTHROPIC_MODEL });
  const result = await provider.generateResponse(body);

  return NextResponse.json(result, { status: result.error ? 502 : 200 });
}
