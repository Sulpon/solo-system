// Phase 14 Step 12 - deterministic, keyword-based context selection. This
// deliberately does NOT ask the LLM to classify intent first (that would
// mean a network round-trip just to decide what to send in the next
// round-trip) - a small, transparent rule set decides which bounded
// context slices to include, directly implementing the worked examples in
// the phase spec ("what should I do now?" -> priority/calendar/mission,
// "what do you know about how I work?" -> memory, etc).

export type ContextSlice = "priority" | "calendar" | "goals" | "intelligence" | "achievements" | "memory" | "relationships";

const ALWAYS_INCLUDED: ReadonlyArray<ContextSlice> = [];

const SLICE_PATTERNS: ReadonlyArray<Readonly<{ slice: ContextSlice; pattern: RegExp }>> = [
  // "What should I do now?" needs Present Moment/Priority Gate AND today's
  // calendar together (Step 13's own worked example) - "now" alone also
  // triggers calendar, not just priority.
  { slice: "priority", pattern: /what should i do|priority|next best action|right now|what am i (working|doing)/i },
  { slice: "calendar", pattern: /today|now\b|calendar|schedule|tomorrow|this week|deadline/i },
  { slice: "goals", pattern: /goal|on track|thesis|dream|milestone/i },
  { slice: "intelligence", pattern: /pattern|friction|momentum|stuck|avoid|risk|signal|behavior/i },
  // "happened" covers "what happened today?" (Step 7's reflection example) -
  // reflection questions like this need both achievements and calendar.
  { slice: "achievements", pattern: /achiev|accomplish|progress|underestimat|proud|win|happened/i },
  { slice: "memory", pattern: /know about|how i work|learned|remember|preference|focus best|working style/i },
  { slice: "relationships", pattern: /connect|relat|linked|project|associated/i },
];

// Fallback set when nothing specific matched - a sensible general-purpose
// default rather than an empty, useless context.
const DEFAULT_SLICES: ReadonlyArray<ContextSlice> = ["priority", "goals", "intelligence"];

export function selectContextSlices(userMessage: string): ReadonlySet<ContextSlice> {
  const slices = new Set<ContextSlice>(ALWAYS_INCLUDED);

  for (const { slice, pattern } of SLICE_PATTERNS) {
    if (pattern.test(userMessage)) {
      slices.add(slice);
    }
  }

  if (slices.size === 0) {
    for (const slice of DEFAULT_SLICES) slices.add(slice);
  }

  return slices;
}
