import type { LLMRequest, LLMResponse } from "./types";

// Phase 14's client-side LLM adapter - the browser NEVER talks to the LLM
// provider directly (no API key on the client, ever). This just calls
// Atlas's own server route (app/api/jarvis/route.ts), which holds the key.
export async function callJarvisProvider(request: LLMRequest, signal?: AbortSignal): Promise<LLMResponse> {
  try {
    const response = await fetch("/api/jarvis", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });

    const json = (await response.json().catch(() => null)) as LLMResponse | null;
    if (!json) {
      return { content: [], stopReason: "error", error: { code: "malformed_response", message: "Atlas's server returned an invalid response." } };
    }
    return json;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { content: [], stopReason: "error", error: { code: "network", message: "Generation stopped." } };
    }
    return { content: [], stopReason: "error", error: { code: "network", message: "Could not reach Atlas's server." } };
  }
}
