// Phase 14's JARVIS Intelligence Interface - shared types. This module is
// imported from BOTH client code (conversation engine, UI) and the server
// route (app/api/jarvis/route.ts) - it must never import anything
// server-only (no API keys, no provider SDK) so it stays safe to bundle
// into the client.
//
// ARCHITECTURE NOTE (read before touching this file): Atlas's entire data
// model lives in the browser (localStorage, optionally cloud-synced as an
// opaque blob - see atlas-snapshot.ts). The Next.js server has NO
// server-side database to query. This means:
//   - JarvisContext is assembled CLIENT-SIDE (jarvis-context-engine.ts,
//     reusing Phase 11-13's engines) and sent to the server as part of the
//     request.
//   - Tools are executed CLIENT-SIDE too (tools.ts) - the server never
//     touches Atlas data directly, it only holds the LLM API key and
//     proxies the conversation. A tool call from the model is returned to
//     the client, executed locally against real Atlas data, and the result
//     is sent back to the server to continue the conversation.
//   - The server (app/api/jarvis/route.ts + anthropic-provider.ts) is a
//     thin, stateless proxy: it never sees more than one request's worth of
//     already-assembled context, and never persists anything.

export type LLMRole = "user" | "assistant";

export type LLMContentBlock =
  | Readonly<{ type: "text"; text: string }>
  | Readonly<{ type: "tool_use"; id: string; name: string; input: Readonly<Record<string, unknown>> }>
  | Readonly<{ type: "tool_result"; toolUseId: string; content: string; isError?: boolean }>;

export type LLMMessage = Readonly<{ role: LLMRole; content: ReadonlyArray<LLMContentBlock> }>;

export type LLMToolDefinition = Readonly<{ name: string; description: string; inputSchema: Readonly<Record<string, unknown>> }>;

export type LLMRequest = Readonly<{
  system: string;
  messages: ReadonlyArray<LLMMessage>;
  tools?: ReadonlyArray<LLMToolDefinition>;
  maxTokens?: number;
}>;

export type LLMStopReason = "end_turn" | "tool_use" | "max_tokens" | "error";

export type LLMErrorCode = "not_configured" | "timeout" | "rate_limited" | "network" | "malformed_response" | "provider_error";

export type LLMResponse = Readonly<{
  content: ReadonlyArray<LLMContentBlock>;
  stopReason: LLMStopReason;
  error?: Readonly<{ code: LLMErrorCode; message: string }>;
}>;

// The provider abstraction (Step 3). AnthropicProvider (server-only) is the
// initial concrete implementation; nothing outside app/api/jarvis/ should
// depend on which provider is in use.
export interface LLMProvider {
  generateResponse(input: LLMRequest): Promise<LLMResponse>;
}

// ---- Structured JARVIS Context (Step 4) ------------------------------------
//
// A deliberately SUMMARIZED, bounded projection of Atlas data - never the
// raw StructuredAtlasContext (Phase 13) verbatim, and never the whole
// Atlas database. Every field here is small and capped; context-selector.ts
// decides which slices actually get populated for a given question
// (unselected slices stay empty, never fabricated).

export type JarvisContextGoal = Readonly<{ id: string; title: string; progress: number; status: string }>;
export type JarvisContextCalendarItem = Readonly<{ questId: string; title: string; status: string; time: string | null }>;
export type JarvisContextInsight = Readonly<{ title: string; explanation: string; priority: string; evidence: ReadonlyArray<string> }>;
export type JarvisContextAchievement = Readonly<{ title: string; explanation: string; type: string; evidence: ReadonlyArray<string> }>;
export type JarvisContextMemory = Readonly<{ type: string; origin: string; content: string; confidence: number }>;
export type JarvisContextRelationshipGroup = Readonly<{ label: string; items: ReadonlyArray<string> }>;

export type JarvisContext = Readonly<{
  now: string;
  currentApp: string | null;
  activeMission: Readonly<{ questId: string; title: string }> | null;
  presentMoment: Readonly<{ importantWorkComplete: boolean; availableUnscheduledMinutes: number | null; nextCommitment: Readonly<{ title: string; time: string }> | null }>;
  priorityGate: Readonly<{ currentQuadrant: string | null }>;
  nextBestAction: Readonly<{ title: string; reason: string; evidence: ReadonlyArray<string> }> | null;
  goals: ReadonlyArray<JarvisContextGoal>;
  todaysCalendar: ReadonlyArray<JarvisContextCalendarItem>;
  insights: ReadonlyArray<JarvisContextInsight>;
  recentAchievements: ReadonlyArray<JarvisContextAchievement>;
  relevantMemories: ReadonlyArray<JarvisContextMemory>;
  relationships: ReadonlyArray<JarvisContextRelationshipGroup>;
}>;

// ---- Conversation (Step 11) -------------------------------------------------

export type JarvisEvidenceItem = Readonly<{ label: string; value?: string }>;

// Phase 15 - one row of an action's before/after preview (Step "ACTION
// PREVIEW: Show exact proposed change"). `before: null` means the field is
// being introduced (e.g. a brand-new Quest's title), not changed.
export type JarvisActionPreviewField = Readonly<{ label: string; before: string | null; after: string }>;

export type JarvisActionType = "schedule_quest" | "create_quest" | "complete_quest" | "log_habit" | "create_note" | "update_goal";

// A proposed Atlas mutation the user must explicitly confirm - never
// executed by the assistant message itself. `preview` is the exact
// proposed change (Phase 15); `summary` stays as a one-line fallback for
// contexts that don't render the full preview table.
//
// Phase 16: `sourceTool`/`sourceArgs` record exactly what was originally
// requested (the propose_* tool name + its raw arguments) so the proposal
// can be REBUILT against current Atlas state right before execution -
// stale-action protection (actions.ts's rebuildProposal). Without this, a
// proposal shown minutes ago could be executed against since-changed data
// (the Quest was deleted, already completed elsewhere, etc.).
export type JarvisActionProposal = Readonly<{
  id: string;
  actionType: JarvisActionType;
  summary: string;
  preview: ReadonlyArray<JarvisActionPreviewField>;
  payload: Readonly<Record<string, unknown>>;
  sourceTool: string;
  sourceArgs: Readonly<Record<string, unknown>>;
}>;

// Phase 15 - the real, verified outcome of executing a confirmed proposal
// (Step "VERIFY RESULT"). Built from the actual data the real Atlas
// mutation function returned/produced, never assumed from the proposal
// alone - see actions.ts's execute* functions.
export type JarvisActionResult = Readonly<{
  ok: boolean;
  message: string;
  verified: ReadonlyArray<JarvisActionPreviewField>;
}>;

// Phase 16 - a multi-step plan (Step "GENERATE PLAN" / "PLAN PREVIEW").
// Built when a single assistant turn proposes 2+ actions - see
// conversation-engine.ts. A single-action turn keeps using
// JarvisMessage.actionProposal exactly as Phase 14/15 did; `plan` is
// additive, never a replacement for that path.
export type JarvisPlanStep = Readonly<{ id: string; proposal: JarvisActionProposal }>;

export type JarvisPlan = Readonly<{ id: string; title: string; steps: ReadonlyArray<JarvisPlanStep> }>;

// The real, verified outcome of one executed (or skipped) plan step -
// mirrors JarvisActionResult but keeps the step's own proposal alongside
// it for display, and `skipped` distinguishes "never attempted because an
// earlier step failed/was stale" from "attempted and failed".
export type JarvisPlanStepOutcome = Readonly<{ stepId: string; proposal: JarvisActionProposal; result: JarvisActionResult; skipped: boolean }>;

export type JarvisMessage = Readonly<{
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  createdAt: string;
  evidence?: ReadonlyArray<JarvisEvidenceItem>;
  referencedEntities?: ReadonlyArray<Readonly<{ label: string; href: string | null }>>;
  actionProposal?: JarvisActionProposal;
  plan?: JarvisPlan;
  toolsUsed?: ReadonlyArray<string>;
  isError?: boolean;
}>;

export type JarvisStatus = "idle" | "sending" | "unavailable" | "offline" | "error";
