import type { RelatedEntityGroup } from "../relationships";

// Phase 13's Personal Memory layer - shared types for the deterministic
// Extraction -> Confidence -> Relevance -> Contradiction pipeline.
//
// Architectural decision, load-bearing for the whole module: NOTHING here
// is persisted. Every PersonalMemory is recomputed fresh from real,
// already-persisted Atlas data (quests, completions, focus history, goal
// tree, achievement moments) on every evaluation, using deterministic ids
// (see memory-extraction-engine.ts) - the same "prefer derived over
// persisted" approach Phase 11's signals and Phase 12's achievement moments
// already use. This means: no new storage-keys.ts entry, no cloud-sync
// change, and identical results on Browser Atlas and Tauri Atlas from the
// same underlying data (Steps 33/34/35 are satisfied by NOT adding
// anything, not by careful schema design).

export type MemoryType = "fact" | "preference" | "pattern" | "experience" | "goal" | "lesson";

// Explicit = the user directly created this (a Dream, a Skill they defined,
// a Note). Derived = Atlas inferred it from repeated behavior. Never
// blurred - see content phrasing rules in memory-extraction-engine.ts
// (explicit reads as a statement of fact; derived reads as an observation:
// "Most X have occurred between...", never "You prefer...").
export type MemoryOrigin = "explicit" | "derived";

// Purely a read-time classification of lastRelevantAt/importance - never a
// stored/mutated field. See memory-relevance-engine.ts.
export type MemoryFreshness = "active" | "fading" | "historical";

export type MemoryEvidence = Readonly<{
  type: string;
  sourceId: string;
  label: string;
  value?: string;
}>;

export type PersonalMemory = Readonly<{
  id: string;
  type: MemoryType;
  origin: MemoryOrigin;
  label: string;
  content: string;
  evidence: ReadonlyArray<MemoryEvidence>;
  // 0-1: how much real data backs this memory (sample size, consistency).
  confidence: number;
  // 0-1: how significant this memory is to the user's life, independent of
  // how much evidence backs it (e.g. an active Dream is important even with
  // just one piece of evidence - it existing).
  importance: number;
  relatedEntityIds: ReadonlyArray<string>;
  relatedGroups: ReadonlyArray<RelatedEntityGroup>;
  createdAt: string;
  updatedAt: string;
  lastRelevantAt: string;
  // Present only when the extractor found real evidence that complicates a
  // simpler earlier read (Step 7) - e.g. a working-time pattern whose
  // recent sessions diverge from its historical majority. Never silently
  // dropped in favor of the newer or older reading alone.
  contradiction?: Readonly<{ note: string; recentEvidence: ReadonlyArray<MemoryEvidence> }>;
}>;
