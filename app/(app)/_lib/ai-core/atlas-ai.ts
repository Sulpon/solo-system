import { tryDeterministicNextActionBypass } from "../jarvis/deterministic-bypass";
import { resolveIntent } from "../jarvis/tool-router";
import { buildJarvisContext, type JarvisContextBuildInput } from "../jarvis/jarvis-context-engine";
import { JARVIS_SYSTEM_PROMPT } from "../jarvis/system-prompt";
import { buildExplicitMemoryProposal } from "./memory-candidate";
import { authorize, type AuthorizationContext, type AuthorizationDecision } from "./permissions";
import type { AtlasTrace } from "./trace";
import type { StructuredAtlasContext } from "../context/context-engine";
import type { CombinedToolResult } from "../jarvis/conversation-engine";
import type { JarvisMessage, JarvisPlan, JarvisActionProposal, LLMToolDefinition } from "../jarvis/types";

// Phase 20 Objective C - Atlas AI Core's orchestration boundary.
//
// This is NOT a rewrite of JARVIS. Every real decision below already
// existed, spread across useJarvisConversation.ts's send() (Phase 14-19.8):
// check the deterministic bypass, resolve intent/tools/context, assemble
// the system prompt. This module lifts that decision sequence out of the
// React hook into one pure, framework-independent function
// (resolveAtlasRequest) so it can be tested without React/Playwright and
// so a FUTURE, non-chat interface (Objective O - desktop, voice, AR) can
// call the exact same orchestration instead of re-deriving it. The React
// hook becomes a thin caller (see useJarvisConversation.ts) - it still owns
// the actual network call, the message list, and Atlas's real mutation
// hooks, which are unavoidably interface-specific.
//
// Objective A audit conclusion (what already qualifies as AI Core vs what
// stays JARVIS-specific):
//   - ALREADY AI Core, reused verbatim, not duplicated: tryDeterministic-
//     NextActionBypass (19.7), resolveIntent (19.8), buildJarvisContext/
//     context-selector (14), JARVIS_SYSTEM_PROMPT (14/20), LLMProvider (14).
//   - NEW this phase, genuinely missing before: a single function that
//     SEQUENCES those existing pieces (this file), a permission/
//     authorization gate in front of tool execution (permissions.ts), a
//     deterministic explicit-memory path (memory-candidate.ts), and
//     structured tracing (trace.ts).
//   - Stays JARVIS/React-specific, NOT moved here: the actual fetch to
//     /api/jarvis (llm-client.ts), the tool-round-trip loop (conversation-
//     engine.ts - already pure and provider-agnostic, so it's reused as-is
//     rather than folded into this file), React state (messages/status),
//     and all Atlas mutation hooks (useProgression, useGoalTree, ...).

// ---- Objective D: three distinct kinds of state, never merged -------------
//
// 1. APPLICATION STATE - what is actually true in Atlas right now (Goals,
//    Quests, Habits, Notes, Calendar, focus/progression). Lives in Atlas's
//    existing localStorage-backed hooks (useProgression, useGoalTree, ...)
//    and is read into StructuredAtlasContext/JarvisContext for a turn -
//    never copied into conversation history or memory.
// 2. CONVERSATION HISTORY - what the user and Atlas said this session.
//    Lives ONLY in useJarvisConversation.ts's React state
//    (JarvisMessage[]/LLMMessage[]) - never persisted to memory (Phase
//    14 Step 11), never treated as application state.
// 3. PERSISTENT MEMORY - information worth carrying into future
//    interactions. Phase 13's PersonalMemory is a deterministic PROJECTION
//    of application state (re-derived, never separately stored); an
//    explicit "remember that" request persists through the existing Note
//    action instead (see memory-candidate.ts) - a real, separate, user-
//    visible entity, distinct from both application state proper and
//    ephemeral conversation history.
export type AtlasStateKind = "application_state" | "conversation_history" | "persistent_memory";

export type AtlasContextInput = Omit<JarvisContextBuildInput, "selectedSlices">;

export type AtlasRequestOutcome =
  | Readonly<{ kind: "bypass"; message: JarvisMessage; trace: AtlasTrace }>
  | Readonly<{ kind: "memory"; proposal: JarvisActionProposal; trace: AtlasTrace }>
  | Readonly<{ kind: "model"; systemPrompt: string; tools: ReadonlyArray<LLMToolDefinition>; trace: AtlasTrace }>;

function buildToolAuthorizationTrace(tools: ReadonlyArray<LLMToolDefinition>, context: AuthorizationContext): ReadonlyArray<Readonly<{ tool: string; allowed: boolean; reason: string }>> {
  return tools.map((tool) => {
    const decision = authorize(tool.name, context);
    return { tool: tool.name, allowed: decision.allowed, reason: decision.reason };
  });
}

// Objective F - a thin, named accessor over the ALREADY-computed relevant
// memories (Phase 13's memory engine, ranked by Phase 13's relevance
// engine, both upstream of StructuredAtlasContext) - re-deriving
// PersonalMemory here would duplicate work useAtlasIntelligenceContext()
// already did for this turn.
export function retrieveMemory(structured: StructuredAtlasContext): StructuredAtlasContext["relevantMemories"] {
  return structured.relevantMemories;
}

// Objective C - a named accessor mirroring the requested `getContext()`
// shape. Delegates entirely to jarvis-context-engine.ts/context-selector.ts
// (Phase 14) - this never assembles context itself.
export function getContext(contextInput: AtlasContextInput, contextSlices: JarvisContextBuildInput["selectedSlices"]) {
  return buildJarvisContext({ ...contextInput, selectedSlices: contextSlices });
}

// Objective C - a named accessor mirroring the requested `resolveTools()`
// shape. Delegates to the Phase 19.8 intent router - never a second tool
// selection algorithm.
export function resolveTools(userMessage: string): ReadonlyArray<LLMToolDefinition> {
  return resolveIntent(userMessage).tools;
}

// Objectives K/M - the single agency boundary between Atlas AI and the
// real tool/action executor. Callers (useJarvisConversation.ts) MUST route
// every tool call the model makes through this function rather than
// invoking their executor directly - it is the one place authorize() is
// guaranteed to run before a tool (read OR propose_*) executes at all.
export function executeAuthorizedAction(
  toolName: string,
  args: Readonly<Record<string, unknown>>,
  context: AuthorizationContext,
  execute: (name: string, args: Readonly<Record<string, unknown>>) => CombinedToolResult,
): CombinedToolResult & Readonly<{ authorization: AuthorizationDecision }> {
  const authorization = authorize(toolName, context);
  if (!authorization.allowed) {
    return { ok: false, data: { error: authorization.reason }, authorization };
  }
  const result = execute(toolName, args);
  return { ...result, authorization };
}

// Objective C - a named accessor for the deterministic explicit-memory
// path (Objective G). Returns null when the message isn't an explicit
// memory request, exactly like the deterministic bypass's own contract -
// callers fall through to normal routing on null.
export function persistMemoryCandidate(userMessage: string): JarvisActionProposal | null {
  return buildExplicitMemoryProposal(userMessage);
}

// The main entry point (Objective C's `processMessage`, split into a pure
// ROUTING decision here - the actual model round-trip still belongs to
// conversation-engine.ts/useJarvisConversation.ts, which own the async
// network/tool-loop concerns this function deliberately stays free of so
// it can be unit-tested without any of that).
export function resolveAtlasRequest(
  input: Readonly<{
    userMessage: string;
    structured: StructuredAtlasContext;
    activePlan: JarvisPlan | null;
    contextInput: AtlasContextInput;
    provider: string | null;
    model: string | null;
  }>,
): AtlasRequestOutcome {
  const { userMessage, structured, activePlan, contextInput, provider, model } = input;

  // 1. Deterministic Next Action bypass (Phase 19.7 Objective E) - highest
  // precedence, answers from already-computed Atlas state, zero model calls.
  const bypassMessage = tryDeterministicNextActionBypass(userMessage, structured, activePlan);
  if (bypassMessage) {
    return {
      kind: "bypass",
      message: bypassMessage,
      trace: { intent: "deterministic", deterministicBypass: true, contextSources: [], memoryRetrieved: 0, toolScope: [], permissionDecisions: [], provider, model, executionResult: "bypassed - no model call" },
    };
  }

  // 2. Explicit memory request ("Remember that...") - also fully
  // deterministic (Objective G / Q Example 4), also zero model calls.
  const memoryProposal = persistMemoryCandidate(userMessage);
  if (memoryProposal) {
    return {
      kind: "memory",
      proposal: memoryProposal,
      trace: { intent: "memory", deterministicBypass: true, contextSources: [], memoryRetrieved: 0, toolScope: [memoryProposal.sourceTool], permissionDecisions: [], provider, model, executionResult: "deterministic memory proposal - no model call" },
    };
  }

  // 3. Intent routing (Phase 19.8) decides both tool scope and context
  // scope in one pass - reused verbatim, not re-implemented.
  const intentResult = resolveIntent(userMessage);
  const authContext: AuthorizationContext = { desktopCapable: contextInput.desktopCapable };

  const systemPrompt =
    intentResult.intent === "casual"
      ? JARVIS_SYSTEM_PROMPT
      : `${JARVIS_SYSTEM_PROMPT}\n\n---\nCurrent structured Atlas context (authoritative, real data only, JSON):\n${JSON.stringify(getContext(contextInput, intentResult.contextSlices))}`;

  return {
    kind: "model",
    systemPrompt,
    tools: intentResult.tools,
    trace: {
      intent: intentResult.intent,
      deterministicBypass: false,
      contextSources: intentResult.contextSlices.size > 0 ? [...intentResult.contextSlices] : [],
      memoryRetrieved: intentResult.contextSlices.has("memory") ? retrieveMemory(structured).length : 0,
      toolScope: intentResult.tools.map((tool) => tool.name),
      permissionDecisions: buildToolAuthorizationTrace(intentResult.tools, authContext),
      provider,
      model,
      executionResult: null,
    },
  };
}
