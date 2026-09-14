import { ALL_JARVIS_TOOLS } from "../jarvis/tool-router";

// Phase 20 Objectives L/M - a small, explicit permission model sitting in
// front of the EXISTING tool registry (tool-router.ts's ALL_JARVIS_TOOLS) -
// not a second tool system. Every real tool name below was found in
// tools.ts/actions.ts/os-actions.ts; none are invented here.
//
// Why this is a genuine, new safety improvement (not just paperwork): prior
// to this phase, useJarvisConversation.ts's executeCombinedTool() switch
// statement would execute ANY tool name the model returned, as long as its
// own switch/executeTool registry recognized it - there was no check that
// the name was one of the tools actually OFFERED for this turn (tool-
// router.ts only controls what's advertised to the model, never what could
// be invoked). authorize() below closes that gap: it is a mandatory,
// tool-name-aware gate called BEFORE execution (see useJarvisConversation.ts).

export type PermissionLevel = "READ" | "SUGGEST" | "EXECUTE" | "AUTO";

// READ - answers a question, changes nothing.
// SUGGEST - reserved for a future tool that surfaces a recommendation with
//   no proposal/confirmation card at all (none exist yet - every current
//   mutating tool already goes through the propose_*/confirm pattern below,
//   so nothing is currently mapped to this level; it exists so a future
//   advisory-only tool has somewhere correct to go without inventing a new
//   permission axis later).
// EXECUTE - proposes a real Atlas (or OS) mutation. Every EXECUTE-level
//   tool in this codebase is a propose_* tool: it still only ever CREATES a
//   proposal object (Phase 15's confirmation-gated pattern) - the actual
//   mutation happens later, in the existing confirmAction() flow, only
//   after the user explicitly clicks Confirm. Naming a tool EXECUTE here
//   describes what it may eventually cause, not that it mutates by itself.
// AUTO - reserved for a future, explicitly-approved class of low-risk
//   actions that could skip confirmation. Nothing is AUTO this phase, and
//   authorize() below unconditionally denies it (Objective L: "do not
//   enable AUTO actions in this phase").
export const TOOL_PERMISSIONS: Readonly<Record<string, PermissionLevel>> = {
  get_current_state: "READ",
  get_next_best_action: "READ",
  get_goal: "READ",
  get_quest: "READ",
  get_calendar: "READ",
  get_recent_achievements: "READ",
  search_memory: "READ",
  get_relationships: "READ",
  get_focus_patterns: "READ",
  get_goal_portfolio_status: "READ",
  get_week_calendar: "READ",
  list_supported_applications: "READ",
  propose_schedule_quest: "EXECUTE",
  propose_create_quest: "EXECUTE",
  propose_complete_quest: "EXECUTE",
  propose_log_habit: "EXECUTE",
  propose_create_note: "EXECUTE",
  propose_update_goal: "EXECUTE",
  propose_open_application: "EXECUTE",
};

// Defensive cross-check, exercised by the unit tests: every tool the app
// actually knows about must have an explicit permission, and vice versa -
// a tool with no permission entry would otherwise silently fall through
// authorize()'s "unrecognized" branch below, which is the SAFE failure
// mode but almost certainly not the intended one if it ever happens.
export const REGISTERED_TOOL_NAMES: ReadonlySet<string> = new Set(ALL_JARVIS_TOOLS.map((tool) => tool.name));

export type AuthorizationContext = Readonly<{ desktopCapable: boolean }>;
export type AuthorizationDecision = Readonly<{ allowed: boolean; level: PermissionLevel | null; reason: string }>;

// The central authorization check (Objective M). The model NEVER grants
// itself permission - this runs in application code, independent of
// anything the model claims, and callers must check `.allowed` before
// invoking the real tool executor. Existing confirmation UI (Phase 15's
// [Confirm]/[Cancel] card) remains the SEPARATE, additional gate for
// EXECUTE-level tools - this function does not replace it, it only decides
// whether the tool may be invoked (to build a proposal, or to read data) at
// all.
export function authorize(toolName: string, context: AuthorizationContext): AuthorizationDecision {
  const level = TOOL_PERMISSIONS[toolName] ?? null;

  if (!level || !REGISTERED_TOOL_NAMES.has(toolName)) {
    return { allowed: false, level: null, reason: `"${toolName}" is not a registered Atlas tool - refusing to execute an unrecognized capability.` };
  }

  if (level === "AUTO") {
    return { allowed: false, level, reason: "AUTO-level actions are not enabled yet - every mutation still requires explicit user confirmation." };
  }

  // Deliberately does NOT DENY propose_open_application when
  // !context.desktopCapable, even though that sounds appealing at first:
  // the EXISTING, already-tested Phase 19 behavior is to still BUILD the
  // proposal (and let the user see it) even in a browser session with no
  // native control, and only honestly refuse at the real execution step
  // (os-launcher.ts's launchApplication, called from
  // executeOpenApplicationAction only after the user clicks Confirm) - see
  // system-prompt.ts's Rule 20, which asks the MODEL not to call this tool
  // when desktopCapable is false, as a prompting nudge, not an
  // application-level gate. Denying the tool call itself here would
  // silently swallow the proposal step and regress that tested behavior
  // (verify-jarvis-os-launcher-e2e.js's "Proposed Action" still renders
  // without desktop capability, failing only after Confirm). AUTHORIZE is
  // about WHICH tools may run at all, not a second copy of a check that
  // already correctly lives at the real execution boundary - `context` is
  // still consulted for an honest, informational reason string only.
  if (toolName === "propose_open_application" && !context.desktopCapable) {
    return { allowed: true, level, reason: "Permitted - this session has no desktop capability, so any resulting proposal will honestly fail at execution time, not here." };
  }

  return { allowed: true, level, reason: "Permitted." };
}
