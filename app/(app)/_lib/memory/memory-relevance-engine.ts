import type { MemoryFreshness, PersonalMemory } from "./types";

// Phase 13 Steps 6 & 25 - Freshness classification and relevance scoring.
// Both are pure, read-time computations over a memory's own timestamps/
// fields - freshness/relevance are never stored or mutated, matching the
// "no new persistence" decision in types.ts.

const ACTIVE_WINDOW_DAYS = 14;
const FADING_WINDOW_DAYS = 60;

function daysSince(now: Date, iso: string): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

// Step 6: never deletes anything - a memory's real content stays intact
// regardless of freshness; only its freshness classification (used by
// relevance scoring and UI de-emphasis) changes over time.
export function computeFreshness(memory: PersonalMemory, now: Date): MemoryFreshness {
  const days = daysSince(now, memory.lastRelevantAt);
  if (days <= ACTIVE_WINDOW_DAYS) return "active";
  if (days <= FADING_WINDOW_DAYS) return "fading";
  return "historical";
}

export type RelevanceContext = Readonly<{
  now: Date;
  // Entity ids currently "in view" - the active Quest, its linked Goal, a
  // Goal/Quest/Note being viewed, etc. Populated by the Context Engine from
  // useAtlasContext() + the current page, never re-derived here.
  contextEntityIds: ReadonlySet<string>;
}>;

// Step 25's transparent weighted formula - deliberately simple, four
// components, no per-app special-casing (that lives one layer up in the
// Context Engine's app-relevance boost - see context-engine.ts):
//   Recency          25%  - how recently this memory was last relevant
//   Importance       30%  - how significant the memory is, independent of evidence
//   Confidence       20%  - how much real evidence backs it
//   Entity overlap    25%  - does it touch something currently in view
const RELEVANCE_WEIGHTS = { recency: 0.25, importance: 0.3, confidence: 0.2, entityOverlap: 0.25 } as const;
const RECENCY_HORIZON_DAYS = 180;

export function computeRelevance(memory: PersonalMemory, context: RelevanceContext): number {
  const recency = clamp01(1 - daysSince(context.now, memory.lastRelevantAt) / RECENCY_HORIZON_DAYS);
  const entityOverlap = memory.relatedEntityIds.some((id) => context.contextEntityIds.has(id)) ? 1 : 0;

  const raw = recency * RELEVANCE_WEIGHTS.recency + memory.importance * RELEVANCE_WEIGHTS.importance + memory.confidence * RELEVANCE_WEIGHTS.confidence + entityOverlap * RELEVANCE_WEIGHTS.entityOverlap;
  return Math.round(raw * 100);
}

export function rankByRelevance(memories: ReadonlyArray<PersonalMemory>, context: RelevanceContext): ReadonlyArray<Readonly<{ memory: PersonalMemory; relevance: number; freshness: MemoryFreshness }>> {
  return memories
    .map((memory) => ({ memory, relevance: computeRelevance(memory, context), freshness: computeFreshness(memory, context.now) }))
    .sort((first, second) => second.relevance - first.relevance);
}
