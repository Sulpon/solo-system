import { buildCreateNoteProposal } from "../jarvis/actions";
import type { JarvisActionProposal } from "../jarvis/types";

// Phase 20 Objectives F/G - evolves Phase 13's memory layer toward an
// explicit lifecycle WITHOUT creating a second memory database.
//
// Audit finding (Objective A): Phase 13's PersonalMemory (memory-engine.ts)
// is a pure, deterministic PROJECTION recomputed from real Atlas data
// (Quests, Goals, focus history, achievements, ...) every time it's read -
// there is no "write a new memory" function anywhere in the existing
// architecture, because there's nothing to write; it's all derived. That
// means an explicit "remember that X" request has no existing memory
// table to insert a row into. It DOES have an existing, real, persisted,
// user-visible, confirmation-gated place to put arbitrary user content:
// Notes (Phase 15's propose_create_note/executeCreateNoteAction). Routing
// an explicit memory request through the EXISTING Note action is exactly
// "create a memory through the existing memory/persistence architecture"
// (Objective G) without inventing a second one - and it inherits Notes'
// existing confirmation gate for free, satisfying "confirmation only if
// required by existing policy" (Notes always required confirmation before
// this phase; nothing here loosens that).
//
// This mirrors deterministic-bypass.ts's own philosophy exactly: a small,
// exact prefix pattern, detected and handled WITHOUT ever calling the
// model - "remember that X" needs no reasoning, just a Note.

const EXPLICIT_MEMORY_PATTERN = /^remember (that|to)?\s*/i;

export function isExplicitMemoryRequest(userMessage: string): boolean {
  return EXPLICIT_MEMORY_PATTERN.test(userMessage.trim());
}

// Deterministically turns "Remember that X" into a real create_note
// proposal (title auto-derived, content = X verbatim - never rephrased or
// summarized by a model, so nothing is fabricated). Returns null when the
// message doesn't match, or when there's no real content left after the
// prefix (mirrors buildCreateNoteProposal's own defensive null return for
// missing content) - callers must fall through to the normal path on null.
export function buildExplicitMemoryProposal(userMessage: string): JarvisActionProposal | null {
  const trimmed = userMessage.trim();
  if (!isExplicitMemoryRequest(trimmed)) return null;

  const content = trimmed.replace(EXPLICIT_MEMORY_PATTERN, "").trim();
  if (!content) return null;

  const title = content.length > 60 ? `${content.slice(0, 60)}…` : content;
  return buildCreateNoteProposal({ title: `Remembered: ${title}`, content });
}

// ---- Implicit memory candidates (Objective F/G) ----------------------------
//
// For anything the model itself notices ("the user prefers working in the
// evening") that was NOT an explicit "remember that" request: Objective G
// is unambiguous that this must never auto-persist merely because the
// model said it. Since the existing architecture has no safe, already-
// approved automatic-persistence threshold for model-authored content
// (Notes' own confirmation gate exists specifically to keep a human in the
// loop for anything user-authored, and extending that trust to model-
// authored text is a materially different decision this phase does not
// make), this is exposed as a typed boundary only - a real, well-defined
// shape a future phase can wire into an actual review/accept flow, per the
// phase's own explicit fallback: "expose a typed boundary for future
// implementation rather than inventing a second persistence layer."

export type MemoryCandidateCategory = "fact" | "goal" | "pattern" | "preference" | "experience" | "lesson";

export type MemoryCandidate = Readonly<{
  category: MemoryCandidateCategory;
  content: string;
  // 0-1. Never fabricated precision - a coarse, honest confidence a future
  // review UI could sort or threshold by, not a claim of statistical rigor.
  confidence: number;
  source: "conversation";
  reason: string;
  entityRefs?: ReadonlyArray<Readonly<{ type: "goal" | "quest"; id: string }>>;
}>;

// No implicit-candidate DETECTOR is implemented this phase (there is no
// deterministic, non-LLM way to decide "did the model just state a
// preference" from its free-text reply, and Objective F explicitly warns
// against "automatically convert[ing] arbitrary model output into
// memory"). This factory exists so a future phase has a single, correct
// shape to construct once that detection exists, rather than each caller
// inventing its own candidate object.
export function createMemoryCandidate(input: Readonly<{ category: MemoryCandidateCategory; content: string; confidence: number; reason: string; entityRefs?: MemoryCandidate["entityRefs"] }>): MemoryCandidate {
  return { category: input.category, content: input.content, confidence: Math.max(0, Math.min(1, input.confidence)), source: "conversation", reason: input.reason, entityRefs: input.entityRefs };
}
