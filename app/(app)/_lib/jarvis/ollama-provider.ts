import type { LLMContentBlock, LLMMessage, LLMProvider, LLMRequest, LLMResponse, LLMStopReason, LLMToolDefinition } from "./types";

// Local JARVIS (Ollama) - a second concrete LLMProvider implementation,
// alongside anthropic-provider.ts (Phase 14), both behind the exact same
// LLMProvider interface app/api/jarvis/route.ts already depends on. Uses
// Ollama's native /api/chat HTTP API directly (no SDK), converting our
// generic, provider-agnostic LLMRequest/LLMResponse shapes at this one
// boundary - nothing outside this file knows it's Ollama, exactly like
// anthropic-provider.ts's own comment documents for Anthropic.
// SERVER-ONLY: only ever imported from app/api/jarvis/route.ts. Ollama
// needs no credential, but the browser still never talks to it directly -
// same request/tool-execution boundary as every other provider (see
// types.ts's architecture note).

export const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
export const DEFAULT_OLLAMA_MODEL = "hf.co/Qwen/Qwen3-4B-GGUF:Q4_K_M";
// Confirmed empirically against the real local setup this was built
// against (RTX 3050 4GB / 8GB RAM): a single "hello" with thinking enabled
// took ~172s end to end (~23s model load + ~149s generation) - each
// /api/jarvis round-trip only ever needs ONE generation (the multi-round
// tool loop is orchestrated client-side in conversation-engine.ts, one
// fresh HTTP request per round, never several provider calls stacked
// inside one request), but a single reasoning-heavy round deciding whether
// to call a tool genuinely exceeded a 180s budget once during manual
// verification. Anthropic's 30s default fires spuriously on hardware like
// this; local inference is genuinely slower, not broken - see the phase
// report's manual smoke-test results for the exact real timings this was
// tuned against.
const DEFAULT_TIMEOUT_MS = 300_000;

// Phase 19.7 - confirmed empirically against the real local setup (see the
// phase report): with no explicit num_ctx, Ollama loads this model at its
// full 40960-token context, which on 4GB VRAM/8GB RAM left only ~24% of
// the model resident in VRAM (the rest fell back to slow CPU inference).
// Requesting num_ctx:8192 instead - still comfortably larger than any
// bounded JarvisContext this app ever sends - raised that to ~58% VRAM-
// resident, confirmed live via GET /api/ps. num_predict is a hard ceiling
// on generated tokens, not a "think less" switch - confirmed empirically
// too: 256 truncated the model mid-thought (`done_reason:"length"`, no
// answer reached at all) on a request that needed ~2500 tokens: 5x
// wouldn't just risk cutting it off, it would corrupt an in-progress tool-
// call JSON, so this deliberately stays generous - 2048 is a real ceiling
// against runaway generation, not a latency dial calibrated to "typical."
const DEFAULT_NUM_CTX = 8192;
const DEFAULT_NUM_PREDICT = 2048;

export type OllamaProviderConfig = Readonly<{
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  numCtx?: number;
  numPredict?: number;
  fetchImpl?: typeof fetch;
  // Phase 19.7 Objective J - optional, dev-only performance telemetry. See
  // route.ts for where this is wired up and gated to non-production.
  onTelemetry?: (event: Readonly<{ providerLatencyMs: number; toolCount: number; contextChars: number; model: string; provider: "ollama" }>) => void;
}>;

type OllamaToolCall = Readonly<{ id?: string; function: Readonly<{ name: string; arguments: unknown }> }>;
type OllamaMessage = Readonly<{ role: "system" | "user" | "assistant" | "tool"; content: string; tool_calls?: ReadonlyArray<OllamaToolCall> }>;

function toOllamaTool(tool: LLMToolDefinition): Record<string, unknown> {
  return { type: "function", function: { name: tool.name, description: tool.description, parameters: tool.inputSchema } };
}

// Ollama's chat API is flat (one role per message), unlike Anthropic's
// block-array-per-message shape - an Atlas LLMMessage carrying a tool_use
// block becomes one Ollama assistant message with `tool_calls`; a message
// carrying tool_result blocks becomes one Ollama `role: "tool"` message
// PER block (Ollama has no multi-block message to fold them into).
function toOllamaMessages(messages: ReadonlyArray<LLMMessage>): OllamaMessage[] {
  const result: OllamaMessage[] = [];

  for (const message of messages) {
    const textParts = message.content.filter((block): block is Extract<LLMContentBlock, { type: "text" }> => block.type === "text").map((block) => block.text);
    const toolUseBlocks = message.content.filter((block): block is Extract<LLMContentBlock, { type: "tool_use" }> => block.type === "tool_use");
    const toolResultBlocks = message.content.filter((block): block is Extract<LLMContentBlock, { type: "tool_result" }> => block.type === "tool_result");

    if (toolResultBlocks.length > 0) {
      for (const block of toolResultBlocks) result.push({ role: "tool", content: block.content });
      continue;
    }

    if (toolUseBlocks.length > 0) {
      result.push({ role: "assistant", content: textParts.join("\n"), tool_calls: toolUseBlocks.map((block) => ({ function: { name: block.name, arguments: block.input } })) });
      continue;
    }

    result.push({ role: message.role, content: textParts.join("\n") });
  }

  return result;
}

// Confirmed empirically against the real local setup: this model (a
// HuggingFace-imported GGUF, not one of Ollama's own thinking-aware
// library builds) does NOT honor `think: false` by omitting reasoning -
// it still emits reasoning text INSIDE `message.content` rather than
// Ollama's separate `thinking` field. Section "THINKING" requires the UI
// never show this regardless, so this strips it defensively rather than
// trusting the request parameter alone.
//
// The exact real shape observed (twice, independently): the chat template
// implicitly starts the assistant turn already "inside" a thinking block -
// the model emits its reasoning then a bare closing `</think>` tag, with
// NO matching opening `<think>` tag anywhere in the string. A naive
// <think>...</think> pair regex would silently fail to match this and leak
// the entire reasoning trace to the user, so this instead treats
// everything up to and including the FIRST </think> as reasoning,
// regardless of whether an opening tag is present - and leaves ordinary
// (non-thinking) responses, which have no </think> at all, untouched.
function stripThinkingBlock(text: string): string {
  const closingTagMatch = text.match(/<\/think>/i);
  if (!closingTagMatch || closingTagMatch.index === undefined) return text.trim();
  return text.slice(closingTagMatch.index + closingTagMatch[0].length).trim();
}

function parseToolCallArguments(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      // Falls through to the safe empty-object default below - never
      // crashes on a tool call we can't cleanly parse (Section "unsupported
      // tool call").
    }
  }
  return {};
}

function fromOllamaMessage(message: unknown): Readonly<{ content: ReadonlyArray<LLMContentBlock>; stopReason: LLMStopReason }> | null {
  if (!message || typeof message !== "object") return null;
  const record = message as Record<string, unknown>;
  const content: LLMContentBlock[] = [];

  if (typeof record.content === "string") {
    const cleaned = stripThinkingBlock(record.content);
    if (cleaned.length > 0) content.push({ type: "text", text: cleaned });
  }

  let hasToolCalls = false;
  if (Array.isArray(record.tool_calls)) {
    record.tool_calls.forEach((rawCall, index) => {
      if (!rawCall || typeof rawCall !== "object") return;
      const call = rawCall as Record<string, unknown>;
      const fn = call.function as Record<string, unknown> | undefined;
      if (!fn || typeof fn.name !== "string") return;
      const id = typeof call.id === "string" ? call.id : `ollama-tool-${index}-${Date.now()}`;
      content.push({ type: "tool_use", id, name: fn.name, input: parseToolCallArguments(fn.arguments) });
      hasToolCalls = true;
    });
  }

  return { content, stopReason: hasToolCalls ? "tool_use" : "end_turn" };
}

export function createOllamaProvider(config: OllamaProviderConfig = {}): LLMProvider {
  const fetchImpl = config.fetchImpl ?? fetch;
  const baseUrl = (config.baseUrl ?? DEFAULT_OLLAMA_BASE_URL).replace(/\/$/, "");
  const model = config.model ?? DEFAULT_OLLAMA_MODEL;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const numCtx = config.numCtx ?? DEFAULT_NUM_CTX;
  const numPredict = config.numPredict ?? DEFAULT_NUM_PREDICT;

  return {
    async generateResponse(input: LLMRequest): Promise<LLMResponse> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const startedAt = Date.now();

      const messages: OllamaMessage[] = [{ role: "system", content: input.system }, ...toOllamaMessages(input.messages)];
      const toolCount = input.tools?.length ?? 0;
      const contextChars = input.system.length + JSON.stringify(input.messages).length;

      const emitTelemetry = () => {
        config.onTelemetry?.({ providerLatencyMs: Date.now() - startedAt, toolCount, contextChars, model, provider: "ollama" });
      };

      try {
        const response = await fetchImpl(`${baseUrl}/api/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model,
            messages,
            ...(input.tools && input.tools.length > 0 ? { tools: input.tools.map(toOllamaTool) } : {}),
            // Section "THINKING": use Ollama's own suppression mechanism -
            // stripThinkingBlock above is the defensive backstop for models/
            // imports (like this one) where it isn't fully honored.
            think: false,
            stream: false,
            // Keeps the model resident between consecutive JARVIS turns in
            // the same session instead of reloading it every request - cold
            // load alone measured ~23s on the reference hardware.
            keep_alive: "5m",
            // Phase 19.7 Objective B - see the DEFAULT_NUM_CTX/
            // DEFAULT_NUM_PREDICT comment above for the real, measured
            // justification for these two specific values.
            options: { num_ctx: numCtx, num_predict: numPredict },
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        emitTelemetry();

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          const providerMessage = errorBody && typeof errorBody === "object" && typeof (errorBody as Record<string, unknown>).error === "string" ? ((errorBody as Record<string, unknown>).error as string) : undefined;

          if (response.status === 404) {
            console.error("[jarvis]", { provider: "ollama", status: response.status, errorType: "provider_error", detail: "model_not_found" });
            return { content: [], stopReason: "error", error: { code: "provider_error", message: `Local model "${model}" was not found. Run: ollama pull ${model}` } };
          }
          console.error("[jarvis]", { provider: "ollama", status: response.status, errorType: "provider_error" });
          return { content: [], stopReason: "error", error: { code: "provider_error", message: providerMessage ?? `Local JARVIS (Ollama) returned an error (status ${response.status}).` } };
        }

        const json = await response.json().catch(() => null);
        const parsed = json && typeof json === "object" ? fromOllamaMessage((json as Record<string, unknown>).message) : null;
        if (!parsed) {
          console.error("[jarvis]", { provider: "ollama", errorType: "malformed_response" });
          return { content: [], stopReason: "error", error: { code: "malformed_response", message: "Local JARVIS (Ollama) returned an invalid response." } };
        }

        return { content: parsed.content, stopReason: parsed.stopReason };
      } catch (error) {
        clearTimeout(timer);
        emitTelemetry();
        if (error instanceof Error && error.name === "AbortError") {
          return { content: [], stopReason: "error", error: { code: "timeout", message: "Local JARVIS (Ollama) took too long to respond." } };
        }
        console.error("[jarvis]", { provider: "ollama", errorType: "network" });
        return { content: [], stopReason: "error", error: { code: "network", message: "Local JARVIS is unavailable. Make sure Ollama is running. Atlas itself is still online." } };
      }
    },
  };
}

// Section "HEALTH CHECK" - a small, on-demand reachability + model-
// availability check, only ever called from the GET diagnostic or right
// before a real request - never polled in the background.
export async function checkOllamaHealth(config: Readonly<{ baseUrl?: string; model?: string; fetchImpl?: typeof fetch }> = {}): Promise<Readonly<{ reachable: boolean; modelAvailable: boolean }>> {
  const fetchImpl = config.fetchImpl ?? fetch;
  const baseUrl = (config.baseUrl ?? DEFAULT_OLLAMA_BASE_URL).replace(/\/$/, "");
  const model = config.model ?? DEFAULT_OLLAMA_MODEL;

  try {
    const response = await fetchImpl(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return { reachable: false, modelAvailable: false };
    const json = await response.json().catch(() => null);
    const models = json && typeof json === "object" && Array.isArray((json as Record<string, unknown>).models) ? ((json as Record<string, unknown>).models as unknown[]) : [];
    const modelAvailable = models.some((entry) => entry && typeof entry === "object" && (entry as Record<string, unknown>).name === model);
    return { reachable: true, modelAvailable };
  } catch {
    return { reachable: false, modelAvailable: false };
  }
}
