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

// Phase 19.5 - "authentication_error" is its own code, distinct from the
// generic "provider_error" bucket - a rejected API key needs a completely
// different fix (check ANTHROPIC_API_KEY) than a generic provider failure,
// and collapsing them together was exactly what made every real failure
// mode look identical to "not configured" in the UI (see conversation-
// engine.ts's buildErrorMessage and the Phase 19.5 report).
export type LLMErrorCode = "not_configured" | "authentication_error" | "timeout" | "rate_limited" | "network" | "malformed_response" | "provider_error";

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

// Phase 18 - a compact, real projection of the persisted active plan (see
// _lib/hooks/useJarvisPlans.ts), always included (never slice-gated, same
// as presentMoment/priorityGate) so "what's my plan"/"what's next"/"why is
// this blocked" are answered from Atlas's own persisted plan state, never
// reconstructed from conversation history. `dependsOn` is already resolved
// to human-readable step summaries so the model never has to reason about
// internal step ids.
export type JarvisContextPlanStep = Readonly<{ summary: string; status: string; dependsOn: ReadonlyArray<string>; failureReason?: string }>;
export type JarvisContextPlan = Readonly<{ title: string; objective: string; status: string; steps: ReadonlyArray<JarvisContextPlanStep> }>;

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
  activePlan: JarvisContextPlan | null;
  // Phase 19 - whether this session is running inside Atlas Desktop (real
  // native OS control) or an ordinary browser tab. Always included so
  // JARVIS can honestly decline an open_application request in the
  // browser instead of proposing an action doomed to fail (see
  // system-prompt.ts) - the real desktop-vs-browser check still happens
  // again in _lib/desktop/os-launcher.ts regardless of what the model does
  // with this.
  desktopCapable: boolean;
}>;

// ---- Conversation (Step 11) -------------------------------------------------

export type JarvisEvidenceItem = Readonly<{ label: string; value?: string }>;

// Phase 15 - one row of an action's before/after preview (Step "ACTION
// PREVIEW: Show exact proposed change"). `before: null` means the field is
// being introduced (e.g. a brand-new Quest's title), not changed.
export type JarvisActionPreviewField = Readonly<{ label: string; before: string | null; after: string }>;

// Phase 19 - "open_application" is Atlas OS v1's first OS action, living
// alongside the existing Atlas-data actions in the SAME proposal/plan
// machinery (see _lib/jarvis/os-actions.ts) rather than a second action
// system. Future OS actions (focus_application, close_application,
// open_url, open_file, ...) extend this same union - none are implemented
// yet.
export type JarvisActionType = "schedule_quest" | "create_quest" | "complete_quest" | "log_habit" | "create_note" | "update_goal" | "open_application";

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
//
// Phase 18: `producedEntityId` is set ONLY by an action that creates a
// brand-new entity (create_quest, create_note) - the real id the Atlas
// mutation actually assigned. This is the sole channel a later plan step
// may reference (see JarvisEntityReference below); nothing else about a
// step's result is ever treated as a cross-step reference.
export type JarvisActionResult = Readonly<{
  ok: boolean;
  message: string;
  verified: ReadonlyArray<JarvisActionPreviewField>;
  producedEntityId?: string;
}>;

// ---- Phase 18: Persistent, dependency-aware Plans --------------------------
//
// Upgrades Phase 16's plan (a one-shot, ephemeral, strictly-sequential list
// attached to a single chat message) into a plan Atlas itself owns: it
// survives the conversation, tracks each step's real dependency/readiness
// state, and threads a real produced entity id from one step into a later
// one - never a guess, never LLM-evaluated code. JARVIS still only ever
// PROPOSES; every status transition below happens through an explicit user
// control (see plan-engine.ts) or a real, verified execution outcome.

export type JarvisPlanStatus = "proposed" | "active" | "paused" | "completed" | "failed" | "cancelled";
export type JarvisPlanStepStatus = "pending" | "blocked" | "ready" | "executing" | "completed" | "failed" | "skipped";

// A deterministic reference to another step's produced entity id, resolved
// ONLY at execution time against that step's real, verified result (see
// plan-engine.ts's resolveStepArgs). `field` names the argument on THIS
// step's own sourceArgs that the resolved id replaces (e.g. "idOrTitle").
export type JarvisEntityReference = Readonly<{ sourceStepId: string; field: "entityId" }>;

export type JarvisPlanStep = Readonly<{
  id: string;
  proposal: JarvisActionProposal;
  status: JarvisPlanStepStatus;
  // Prerequisite step ids within the same plan - derived deterministically
  // from the proposal's own sourceArgs.refs (see plan-engine.ts), never
  // hand-declared by the LLM as a free-form graph.
  dependencies: ReadonlyArray<string>;
  // Maps an argument name on this step's proposal to the earlier step whose
  // real output should be substituted in for it. Present only when the LLM
  // used `refs` when proposing this step (see actions.ts's tool schemas).
  entityRefs?: Readonly<Record<string, JarvisEntityReference>>;
  createdAt: string;
  updatedAt: string;
  result?: JarvisActionResult;
  failureReason?: string;
  completedAt?: string;
}>;

export type JarvisPlan = Readonly<{
  id: string;
  title: string;
  objective: string;
  createdAt: string;
  updatedAt: string;
  status: JarvisPlanStatus;
  steps: ReadonlyArray<JarvisPlanStep>;
  rationale?: string;
  tradeoffs?: string;
  horizon?: string;
  source?: string;
}>;

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
