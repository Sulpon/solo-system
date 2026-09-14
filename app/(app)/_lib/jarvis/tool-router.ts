import { JARVIS_TOOLS } from "./tools";
import { JARVIS_ACTION_TOOLS } from "./actions";
import { JARVIS_OS_ACTION_TOOLS } from "./os-actions";
import { OS_APPLICATION_REGISTRY } from "../os/application-registry";
import { isDeterministicNextActionQuery } from "./deterministic-bypass";
import { selectContextSlices, type ContextSlice } from "./context-selector";
import type { LLMToolDefinition } from "./types";

// Phase 19.7 Objective D/F/G - a small, deterministic, keyword-based tool
// router, following the EXACT philosophy context-selector.ts already
// established (Phase 14): no LLM classification round-trip, a transparent
// regex rule set instead. This is NOT a second tool registry - every name
// below is resolved against the real JARVIS_TOOLS/JARVIS_ACTION_TOOLS/
// JARVIS_OS_ACTION_TOOLS arrays every other part of JARVIS already uses
// (see ALL_TOOLS in useJarvisConversation.ts); this file only ever
// narrows a SUBSET of those existing definitions for a given request.
//
// Why this matters for local inference specifically (confirmed empirically
// - see the Phase 19.7 report): sending all ~19 tool schemas on every
// request measurably inflates a small model's own "thinking" trace (it
// reasons through the options even for requests that need none of them),
// on top of the literal token cost of the schemas themselves. Narrowing to
// a handful of genuinely relevant tools shrinks both.

export const ALL_JARVIS_TOOLS: ReadonlyArray<LLMToolDefinition> = [...JARVIS_TOOLS, ...JARVIS_ACTION_TOOLS, ...JARVIS_OS_ACTION_TOOLS];
const TOOLS_BY_NAME = new Map(ALL_JARVIS_TOOLS.map((tool) => [tool.name, tool]));

export type ToolCategory = "quests" | "goals" | "habits" | "notes" | "planning" | "system";

// A small, always-cheap baseline every narrowed scope still carries - both
// are tiny, read-only, and broadly useful as grounding even for a request
// that's clearly about something else (e.g. "create a quest" may still
// benefit from the model seeing get_current_state's shape), so excluding
// them would save negligible tokens for a real risk of losing something
// genuinely useful. Section F: "correctness is more important than
// maximum latency reduction."
const BASELINE_TOOLS: ReadonlyArray<string> = ["get_current_state", "get_next_best_action"];

// Phase 19.8 Objective K - broadened to their plural forms too
// (goal/goals, quest/quests, etc). \bgoal\b does NOT match "goals" (there's
// no word boundary between "goal" and the trailing "s"), which meant "What
// do you think about my goals?" previously matched no category at all and
// could have been misrouted toward the new casual path below - a real
// false-positive risk the phase spec calls out explicitly. Singular/plural
// is a purely mechanical broadening, not a new classifier.
const GOAL_SIGNAL_PATTERN = /\bgoals?\b|\bdreams?\b|\bmilestones?\b|\bthesis\b|\bon track\b|\bportfolio\b/i;
// "complete"/"finish" alone are ambiguous - "mark this GOAL as complete" is
// a goals request, not a quests one. Unlike quest/task/chapter (unambiguous
// quest words), these only count toward "quests" when the message doesn't
// ALSO mention a goal anywhere - a plain regex lookahead can't express
// this (it only looks forward from the match, so "goal ... complete" -
// goal appearing BEFORE the trigger word - would slip through), so this is
// a real word-order-independent check instead of a single fragile regex.
const QUEST_STRONG_PATTERN = /\bquests?\b|\btasks?\b|\bchapters?\b/i;
const QUEST_WEAK_PATTERN = /\bfinish\b|\bcomplete\b/i;

function matchesQuests(normalized: string): boolean {
  if (QUEST_STRONG_PATTERN.test(normalized)) return true;
  return QUEST_WEAK_PATTERN.test(normalized) && !GOAL_SIGNAL_PATTERN.test(normalized);
}

// Category -> {detection, real tool names}. Every tool name here was found
// in tools.ts/actions.ts/os-actions.ts during the Phase 19.7 audit - none
// invented. "quests" uses matchesQuests (above) instead of a plain
// pattern; every other category is a plain, order-independent keyword
// regex, which is safe since none of them have the same directional
// ambiguity problem.
const CATEGORY_RULES: ReadonlyArray<Readonly<{ category: ToolCategory; matches: (normalized: string) => boolean; tools: ReadonlyArray<string> }>> = [
  { category: "quests", matches: matchesQuests, tools: ["propose_create_quest", "propose_schedule_quest", "propose_complete_quest", "get_quest", "get_calendar"] },
  { category: "goals", matches: (normalized) => GOAL_SIGNAL_PATTERN.test(normalized), tools: ["get_goal", "propose_update_goal", "get_goal_portfolio_status"] },
  { category: "habits", matches: (normalized) => /\bhabits?\b|\bstreaks?\b/i.test(normalized), tools: ["propose_log_habit", "get_quest"] },
  { category: "notes", matches: (normalized) => /\bnotes?\b|\bwrite down\b|\bjot\b/i.test(normalized), tools: ["propose_create_note", "search_memory"] },
  { category: "planning", matches: (normalized) => /\bweeks?\b|\bplans?\b|\bplanning\b|\bcalendars?\b|\bschedules?\b|\bscheduling\b|\bbalance\b|\bwhat should i cut\b/i.test(normalized), tools: ["get_week_calendar", "get_goal_portfolio_status", "get_calendar"] },
];

// "system" (open an application) is deliberately resolved against the REAL
// application registry rather than a hand-written app-name list - never a
// second, drifting copy of what Atlas can actually open.
const OPEN_VERB_PATTERN = /\b(open|launch|start)\b/i;
function mentionsRegisteredApplication(normalized: string): boolean {
  return OS_APPLICATION_REGISTRY.some((entry) => entry.name.toLowerCase().split(" ").some((word) => normalized.includes(word)) || entry.aliases.some((alias) => normalized.includes(alias.toLowerCase())));
}

export type ToolRouteResult = Readonly<{
  tools: ReadonlyArray<LLMToolDefinition>;
  category: ToolCategory | "ambiguous";
  confidence: "high" | "low";
}>;

// Deterministic and conservative (Section F): 0 matched categories (nothing
// recognized) or too many at once (a genuinely broad/multi-topic request)
// both fall back to the FULL existing tool set rather than guessing - a
// router that hides a tool it wasn't sure about is worse than one that
// saves nothing. Only a small, confident number of matches actually narrows.
const MAX_CONFIDENT_CATEGORIES = 3;

export function resolveToolScope(userMessage: string): ToolRouteResult {
  const normalized = userMessage.trim().toLowerCase();
  const matchedCategories = new Set<ToolCategory>();
  const toolNames = new Set<string>();

  for (const rule of CATEGORY_RULES) {
    if (rule.matches(normalized)) {
      matchedCategories.add(rule.category);
      for (const name of rule.tools) toolNames.add(name);
    }
  }

  if (OPEN_VERB_PATTERN.test(normalized) && mentionsRegisteredApplication(normalized)) {
    matchedCategories.add("system");
    toolNames.add("propose_open_application");
    toolNames.add("list_supported_applications");
  }

  if (matchedCategories.size === 0 || matchedCategories.size > MAX_CONFIDENT_CATEGORIES) {
    return { tools: ALL_JARVIS_TOOLS, category: "ambiguous", confidence: "low" };
  }

  for (const name of BASELINE_TOOLS) toolNames.add(name);

  const tools = [...toolNames].map((name) => TOOLS_BY_NAME.get(name)).filter((tool): tool is LLMToolDefinition => tool !== undefined);
  const [firstCategory] = matchedCategories;

  return { tools, category: matchedCategories.size === 1 ? firstCategory : "ambiguous", confidence: matchedCategories.size === 1 ? "high" : "low" };
}

// ================================================================
// Phase 19.8 Objective B - a lightweight INTENT layer built directly on
// top of the tool router above (extends it, does not compete with it -
// resolveToolScope's own category matching stays the single source of
// truth for "does this mention an Atlas topic," untouched). The one thing
// 19.7's router couldn't express: a request that mentions NO Atlas topic
// at all isn't automatically "ambiguous, send everything" - it might be
// ordinary conversation, which needs neither Atlas tools nor Atlas
// context. This layer adds exactly that one missing case.
// ================================================================

export type Intent = "deterministic" | "casual" | "quest" | "goal" | "habit" | "note" | "planning" | "system" | "ambiguous";

export type IntentResult = Readonly<{
  intent: Intent;
  tools: ReadonlyArray<LLMToolDefinition>;
  confidence: "high" | "low";
  // Empty for "deterministic" (the bypass answers without ever building a
  // request) and "casual" (Objective C/I: no Atlas context belongs in a
  // conversational request) and "system" (Objective I: a
  // propose_open_application request needs desktopCapable/currentApp, both
  // always-present ambient fields in JarvisContext, but no goal/calendar/
  // achievement/memory/relationship slice) - real, selector-computed
  // slices otherwise (Objective I: reuse context-selector.ts, never a
  // second context system).
  contextSlices: ReadonlySet<ContextSlice>;
}>;

const CATEGORY_TO_INTENT: Readonly<Record<ToolCategory, Intent>> = {
  quests: "quest",
  goals: "goal",
  habits: "habit",
  notes: "note",
  planning: "planning",
  system: "system",
};

// Deliberately a small, exact/prefix allowlist - the same "narrow and
// conservative over clever" philosophy as deterministic-bypass.ts's own
// NEXT_ACTION_BYPASS_PATTERN, not a general open-domain classifier. This
// is only ever consulted AFTER resolveToolScope finds no real Atlas-topic
// match (see resolveIntent below) - Objective K's precedence rule - so a
// message that happens to start with "what is" but also names a real
// Atlas topic (e.g. "what is my next quest?") never reaches this at all.
const GREETING_PATTERN = /^(hi|hello|hey|hiya|yo|sup)[\s,!.]*(jarvis)?[\s,!.]*$/i;
const WELLBEING_PATTERN = /^(how are you\??|how'?s it going\??|good (morning|afternoon|evening)!?\.?)$/i;
const IDENTITY_PATTERN = /^(who are you\??|what are you\??|introduce yourself\.?|what can you do\??)$/i;
const OPEN_DOMAIN_PREFIX_PATTERN = /^(what is |what'?s |explain |what do you think about )/i;
const OPEN_DOMAIN_EXACT_PATTERN = /^tell me something interesting\.?$/i;

function isCasualConversation(normalized: string): boolean {
  return GREETING_PATTERN.test(normalized) || WELLBEING_PATTERN.test(normalized) || IDENTITY_PATTERN.test(normalized) || OPEN_DOMAIN_EXACT_PATTERN.test(normalized) || OPEN_DOMAIN_PREFIX_PATTERN.test(normalized);
}

// The single entry point Phase 19.8 wires into useJarvisConversation.ts,
// replacing its previous direct call to resolveToolScope. Precedence
// (Objective K - correctness over cleverness):
//   1. The Phase 19.7 deterministic bypass's own pattern - if it matches,
//      the caller never builds a request at all, so 0 tools/no context is
//      the honest report regardless of what the router would have said.
//   2. Any real, confident-or-narrowed Atlas-topic match from the
//      EXISTING resolveToolScope (unmodified) always wins over casual-
//      sounding phrasing - "what do you think about my goals?" is a goal
//      question, not small talk, even though it also matches the casual
//      "what do you think about " prefix.
//   3. Only once resolveToolScope finds nothing Atlas-specific at all does
//      a positive casual-conversation match apply zero tools/context.
//   4. Otherwise, genuinely unclear - the existing full-tool-set safety
//      fallback (Section F: never hide a capability out of uncertainty).
export function resolveIntent(userMessage: string): IntentResult {
  const normalized = userMessage.trim().toLowerCase();

  if (isDeterministicNextActionQuery(userMessage)) {
    return { intent: "deterministic", tools: [], confidence: "high", contextSlices: new Set() };
  }

  const toolScope = resolveToolScope(userMessage);
  const isFullFallback = toolScope.tools.length === ALL_JARVIS_TOOLS.length;

  if (!isFullFallback) {
    const intent = toolScope.category === "ambiguous" ? "ambiguous" : CATEGORY_TO_INTENT[toolScope.category];
    const contextSlices = toolScope.category === "system" ? new Set<ContextSlice>() : selectContextSlices(userMessage);
    return { intent, tools: toolScope.tools, confidence: toolScope.confidence, contextSlices };
  }

  if (isCasualConversation(normalized)) {
    return { intent: "casual", tools: [], confidence: "high", contextSlices: new Set() };
  }

  // Genuinely unclear - keep the Phase 19.7 safety fallback verbatim
  // (full tool set, real context) rather than guessing either way.
  return { intent: "ambiguous", tools: toolScope.tools, confidence: "low", contextSlices: selectContextSlices(userMessage) };
}
