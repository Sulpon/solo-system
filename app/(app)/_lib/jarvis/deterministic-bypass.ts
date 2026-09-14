import { nextReadyStep } from "./plan-engine";
import type { StructuredAtlasContext } from "../context/context-engine";
import type { JarvisMessage, JarvisPlan } from "./types";

// Phase 19.7 Objective E - Atlas already computes an exact, deterministic
// answer to "what should I do now?" (Phase 11's NextAction engine, Phase
// 18's persistent plan). Round-tripping that through a local LLM - build
// bounded context, send ~19 tool schemas, wait for the model to "think,"
// call get_next_best_action, wait again for it to re-narrate the exact
// same answer in its own words - adds real latency (confirmed empirically
// on this hardware) for zero actual decision-making, since the answer was
// already fixed before the request was ever sent. This module recognizes
// ONLY that one narrow, canonical phrasing and answers directly from real
// Atlas data - never the LLM, never a guess. Anything even slightly more
// nuanced (e.g. "what should I do about my thesis vs the job search?")
// does NOT match and falls through to the normal LLM path unchanged.
//
// Deliberately NOT a general intent classifier (Section F explicitly warns
// against building one) - a small, exact allowlist of canonical phrasings,
// the same "narrow and conservative over clever" philosophy tool-router.ts
// uses.

const NEXT_ACTION_BYPASS_PATTERN = /^(what should i do( right)? now\??|what should i do\??|what'?s next\??|what is next\??|what should i work on\??)$/i;

function generateMessageId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `bypass-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalize(message: string): string {
  return message.trim().replace(/\s+/g, " ");
}

export function isDeterministicNextActionQuery(userMessage: string): boolean {
  return NEXT_ACTION_BYPASS_PATTERN.test(normalize(userMessage));
}

// Returns a real, fully-formed JarvisMessage built ONLY from real Atlas
// data (never LLM-generated) when the request matches, or null when it
// doesn't - callers must fall through to the normal LLM conversation path
// on null, exactly as if this module didn't exist.
export function tryDeterministicNextActionBypass(userMessage: string, structured: StructuredAtlasContext, activePlan: JarvisPlan | null): JarvisMessage | null {
  if (!isDeterministicNextActionQuery(userMessage)) return null;

  const now = new Date().toISOString();

  // Same precedence rule as system-prompt.ts's Rule 17: an in-progress
  // plan's own ready step wins over a competing recommendation.
  const readyStep = activePlan ? nextReadyStep(activePlan) : null;
  if (readyStep) {
    return {
      id: generateMessageId(),
      role: "assistant",
      text: `Your plan "${activePlan?.title}" has a ready step: ${readyStep.proposal.summary}.`,
      createdAt: now,
      toolsUsed: [],
    };
  }

  if (structured.activeMission) {
    return {
      id: generateMessageId(),
      role: "assistant",
      text: `You already have an active mission: "${structured.activeMission.title}". Stay focused on that rather than starting something new.`,
      createdAt: now,
      toolsUsed: [],
    };
  }

  const action = structured.nextBestAction;
  if (!action) {
    return {
      id: generateMessageId(),
      role: "assistant",
      text: "I don't have a specific recommendation right now - nothing in Atlas currently qualifies as the next best action.",
      createdAt: now,
      toolsUsed: [],
    };
  }

  return {
    id: generateMessageId(),
    role: "assistant",
    text: `${action.title}\n\n${action.reason}`,
    createdAt: now,
    toolsUsed: [],
    evidence: action.evidence.length > 0 ? action.evidence.map((label) => ({ label })) : undefined,
  };
}
