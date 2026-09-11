import { buildPlanFromProposals } from "./plan-engine";
import type { JarvisActionProposal, JarvisEvidenceItem, JarvisMessage, LLMContentBlock, LLMMessage, LLMRequest, LLMResponse, LLMToolDefinition } from "./types";

// Phase 14's Conversation Engine - the orchestration layer between the UI
// and the LLM Adapter. Deliberately provider-agnostic and tool-agnostic
// (pure functions, no React, no fetch, no knowledge of Atlas data): it only
// knows how to run the request/tool-call/tool-result loop given a
// `callProvider` function and an `executeTool` function supplied by the
// caller (see hooks/useJarvisConversation.ts, which supplies the real
// provider call and the real Atlas-backed tool executor). Testable with a
// fully deterministic stub provider and stub tool executor.

export type CombinedToolResult = Readonly<{ ok: boolean; data: unknown; actionProposal?: JarvisActionProposal }>;
export type ToolExecutorFn = (name: string, args: Readonly<Record<string, unknown>>) => CombinedToolResult;
export type ProviderCallFn = (request: LLMRequest) => Promise<LLMResponse>;

// A safety cap on the tool round-trip loop - never let a misbehaving model
// loop forever calling tools.
const MAX_TOOL_ROUNDS = 4;

function generateMessageId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function extractText(content: ReadonlyArray<LLMContentBlock>): string {
  return content
    .filter((block): block is Extract<LLMContentBlock, { type: "text" }> => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

// Evidence shown to the user must come from a real tool result, never the
// model's own prose - a tool result carrying a string[] `evidence` field
// (get_next_best_action, get_current_state's signals) or entity `connected`
// groups (get_goal/get_quest) is normalized here; nothing here reads or
// interprets the model's text output.
function extractEvidenceFromToolData(data: unknown): JarvisEvidenceItem[] {
  if (!data || typeof data !== "object") return [];
  const record = data as Record<string, unknown>;
  if (Array.isArray(record.evidence)) {
    return record.evidence.filter((item): item is string => typeof item === "string").map((label) => ({ label }));
  }
  return [];
}

function buildErrorMessage(error: Readonly<{ code: string; message: string }>): JarvisMessage {
  const friendly =
    error.code === "not_configured"
      ? "JARVIS is not yet configured. Atlas itself is still fully functional."
      : error.code === "timeout"
        ? "JARVIS is taking too long to respond. Please try again."
        : error.code === "rate_limited"
          ? "JARVIS is temporarily rate-limited. Please try again shortly."
          : error.code === "network"
            ? "JARVIS could not be reached. Atlas itself is still online."
            : "JARVIS is temporarily unavailable. Atlas itself is still online.";

  return { id: generateMessageId(), role: "assistant", text: friendly, createdAt: new Date().toISOString(), isError: true };
}

export async function runConversationTurn(input: Readonly<{
  systemPrompt: string;
  llmHistory: ReadonlyArray<LLMMessage>;
  userText: string;
  tools: ReadonlyArray<LLMToolDefinition>;
  callProvider: ProviderCallFn;
  executeTool: ToolExecutorFn;
}>): Promise<Readonly<{ llmHistory: ReadonlyArray<LLMMessage>; assistantMessage: JarvisMessage }>> {
  let history: ReadonlyArray<LLMMessage> = [...input.llmHistory, { role: "user", content: [{ type: "text", text: input.userText }] }];
  const toolsUsed: string[] = [];
  const collectedEvidence: JarvisEvidenceItem[] = [];
  // Phase 16: every proposal from this turn is kept (not just the last) -
  // one proposal stays a single action (Phase 14/15 behavior), two or more
  // become a JarvisPlan (see the end-of-turn branch below).
  const actionProposals: JarvisActionProposal[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await input.callProvider({ system: input.systemPrompt, messages: history, tools: input.tools });

    if (response.error) {
      return { llmHistory: history, assistantMessage: buildErrorMessage(response.error) };
    }

    history = [...history, { role: "assistant", content: response.content }];

    if (response.stopReason !== "tool_use") {
      const text = extractText(response.content);
      return {
        llmHistory: history,
        assistantMessage: {
          id: generateMessageId(),
          role: "assistant",
          text: text || "I don't have a response for that.",
          createdAt: new Date().toISOString(),
          toolsUsed,
          actionProposal: actionProposals.length === 1 ? actionProposals[0] : undefined,
          plan: actionProposals.length >= 2 ? buildPlanFromProposals(actionProposals) : undefined,
          evidence: collectedEvidence.length > 0 ? collectedEvidence : undefined,
        },
      };
    }

    const toolUseBlocks = response.content.filter((block): block is Extract<LLMContentBlock, { type: "tool_use" }> => block.type === "tool_use");
    if (toolUseBlocks.length === 0) {
      return { llmHistory: history, assistantMessage: buildErrorMessage({ code: "malformed_response", message: "Model signaled a tool call with none present." }) };
    }

    const resultBlocks: LLMContentBlock[] = [];
    for (const block of toolUseBlocks) {
      toolsUsed.push(block.name);
      const result = input.executeTool(block.name, block.input);
      if (result.actionProposal) actionProposals.push(result.actionProposal);
      if (result.ok) collectedEvidence.push(...extractEvidenceFromToolData(result.data));
      resultBlocks.push({ type: "tool_result", toolUseId: block.id, content: JSON.stringify(result.data), isError: !result.ok });
    }
    history = [...history, { role: "user", content: resultBlocks }];
  }

  return { llmHistory: history, assistantMessage: buildErrorMessage({ code: "provider_error", message: "Too many tool calls in a single turn." }) };
}
