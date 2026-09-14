// Phase 20 Objectives H/I - normalized shapes for imported historical
// conversations. Deliberately separate from JarvisMessage/LLMMessage
// (conversation-engine.ts's live-session shapes): a ConversationRecord is a
// PAST, imported, read-only historical record, never fed directly into a
// live LLM turn's message history, and never rewritten in place (Objective
// I: "do not delete or rewrite the source").

export type ConversationSource = "chatgpt_export";

export type ConversationParticipant = "user" | "assistant" | "system";

export type ConversationRecordMessage = Readonly<{
  role: ConversationParticipant;
  content: string;
  // Some exports omit a per-message timestamp for every node - null is
  // honest ("unknown"), never backfilled with a guess.
  timestamp: string | null;
}>;

export type ConversationRecord = Readonly<{
  // Atlas-local id (generated at import time - stable across re-reads of
  // the same imported file, never the same as the raw export's own id
  // scheme, which varies by source).
  id: string;
  source: ConversationSource;
  // The ORIGINAL id from the source export, kept verbatim for traceability
  // back to the raw file - never used as Atlas's own primary key.
  conversationId: string;
  title: string;
  createdAt: string;
  messages: ReadonlyArray<ConversationRecordMessage>;
  participants: ReadonlyArray<ConversationParticipant>;
  metadata: Readonly<Record<string, unknown>>;
}>;

// ---- Objective I: candidate extraction -------------------------------------

export type HistoricalCandidateType = "fact" | "goal" | "project" | "decision" | "preference" | "milestone" | "lesson" | "unresolved_topic" | "historical_context";

// The system must distinguish SOURCE CONVERSATION from EXTRACTED MEMORY
// (Objective I) - `conversationId` here is Atlas's own ConversationRecord.id
// (never the raw export id), so a candidate always traces back to exactly
// one, real, unmodified source record. Extraction never deletes or
// rewrites that record.
export type ExtractedCandidate = Readonly<{
  id: string;
  conversationId: string;
  type: HistoricalCandidateType;
  content: string;
  // 0-1, deterministic (pattern-match strength), never a fabricated
  // semantic-similarity score.
  confidence: number;
  sourceExcerpt: string;
  reason: string;
  // Objective I: candidates require user review before becoming Atlas
  // memory - this is the review state, not a persistence decision.
  reviewStatus: "pending" | "accepted" | "dismissed";
}>;
