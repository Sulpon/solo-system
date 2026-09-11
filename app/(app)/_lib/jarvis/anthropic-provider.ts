import type { LLMContentBlock, LLMMessage, LLMProvider, LLMRequest, LLMResponse, LLMStopReason, LLMToolDefinition } from "./types";

// Phase 14 Step 3 - the initial concrete LLMProvider implementation.
// SERVER-ONLY: only ever imported from app/api/jarvis/route.ts. Uses a
// plain fetch call (no SDK dependency) against the Anthropic Messages API,
// converting our generic, provider-agnostic LLMRequest/LLMResponse shapes
// at this one boundary - nothing outside this file knows it's Anthropic.

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-5";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_TOKENS = 1024;

export type AnthropicProviderConfig = Readonly<{
  apiKey: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}>;

function toAnthropicContentBlock(block: LLMContentBlock): Record<string, unknown> {
  if (block.type === "text") return { type: "text", text: block.text };
  if (block.type === "tool_use") return { type: "tool_use", id: block.id, name: block.name, input: block.input };
  return { type: "tool_result", tool_use_id: block.toolUseId, content: block.content, is_error: block.isError ?? false };
}

function toAnthropicMessage(message: LLMMessage): Record<string, unknown> {
  return { role: message.role, content: message.content.map(toAnthropicContentBlock) };
}

function toAnthropicTool(tool: LLMToolDefinition): Record<string, unknown> {
  return { name: tool.name, description: tool.description, input_schema: tool.inputSchema };
}

function fromAnthropicBlock(block: unknown): LLMContentBlock | null {
  if (!block || typeof block !== "object") return null;
  const record = block as Record<string, unknown>;
  if (record.type === "text" && typeof record.text === "string") {
    return { type: "text", text: record.text };
  }
  if (record.type === "tool_use" && typeof record.id === "string" && typeof record.name === "string") {
    return { type: "tool_use", id: record.id, name: record.name, input: (record.input as Record<string, unknown>) ?? {} };
  }
  return null;
}

function mapStopReason(reason: unknown): LLMStopReason {
  if (reason === "tool_use") return "tool_use";
  if (reason === "max_tokens") return "max_tokens";
  return "end_turn";
}

export function createAnthropicProvider(config: AnthropicProviderConfig): LLMProvider {
  const fetchImpl = config.fetchImpl ?? fetch;
  const model = config.model ?? DEFAULT_MODEL;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    async generateResponse(input: LLMRequest): Promise<LLMResponse> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchImpl(ANTHROPIC_API_URL, {
          method: "POST",
          headers: { "x-api-key": config.apiKey, "anthropic-version": ANTHROPIC_VERSION, "content-type": "application/json" },
          body: JSON.stringify({
            model,
            max_tokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
            system: input.system,
            messages: input.messages.map(toAnthropicMessage),
            ...(input.tools && input.tools.length > 0 ? { tools: input.tools.map(toAnthropicTool) } : {}),
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (response.status === 401 || response.status === 403) {
          return { content: [], stopReason: "error", error: { code: "provider_error", message: "Authentication with the LLM provider failed." } };
        }
        if (response.status === 429) {
          return { content: [], stopReason: "error", error: { code: "rate_limited", message: "The LLM provider is rate-limited right now." } };
        }
        if (!response.ok) {
          return { content: [], stopReason: "error", error: { code: "provider_error", message: `LLM provider returned status ${response.status}.` } };
        }

        const json = await response.json().catch(() => null);
        if (!json || typeof json !== "object" || !Array.isArray((json as Record<string, unknown>).content)) {
          return { content: [], stopReason: "error", error: { code: "malformed_response", message: "LLM provider returned an unexpected response shape." } };
        }

        const content = ((json as Record<string, unknown>).content as unknown[]).map(fromAnthropicBlock).filter((block): block is LLMContentBlock => block !== null);
        return { content, stopReason: mapStopReason((json as Record<string, unknown>).stop_reason) };
      } catch (error) {
        clearTimeout(timer);
        if (error instanceof Error && error.name === "AbortError") {
          return { content: [], stopReason: "error", error: { code: "timeout", message: "The LLM provider took too long to respond." } };
        }
        return { content: [], stopReason: "error", error: { code: "network", message: "Could not reach the LLM provider." } };
      }
    },
  };
}
