import type { ConversationRecord, ExtractedCandidate, HistoricalCandidateType } from "./types";

// Phase 20 Objective I - deterministic, pattern-based candidate extraction
// from an imported ConversationRecord. Deliberately NOT model-based: this
// phase does not call Qwen to "read" imported history (that would be
// exactly the "automatically convert arbitrary model output into memory"
// Objective F prohibits, applied to a much larger, less-trusted input).
// Instead, a small set of real, literal decision/preference/goal phrasings
// - the same "narrow and conservative over clever" philosophy tool-
// router.ts and deterministic-bypass.ts already use - flags SENTENCES
// worth a human's review, never Atlas's own memory automatically.
//
// This is explicitly a FOUNDATION (Objective I frames it that way) - a
// real, working, conservative first pass, not a complete NLP pipeline.

const SENTENCE_SPLIT_PATTERN = /(?<=[.!?])\s+/;

const PATTERN_RULES: ReadonlyArray<Readonly<{ type: HistoricalCandidateType; pattern: RegExp; confidence: number }>> = [
  { type: "decision", pattern: /\b(i('| a)?ve )?decided to\b|\bwe('| a)?ll go with\b|\blet'?s use\b/i, confidence: 0.7 },
  { type: "goal", pattern: /\bi (want|plan|need) to\b|\bthe goal is\b|\bmy goal is\b/i, confidence: 0.6 },
  { type: "preference", pattern: /\bi prefer\b|\bi'?d rather\b|\bi like to\b/i, confidence: 0.6 },
  { type: "milestone", pattern: /\bi finished\b|\bi completed\b|\bi shipped\b|\bi launched\b/i, confidence: 0.65 },
  { type: "lesson", pattern: /\bi learned\b|\bturns out\b|\bin hindsight\b/i, confidence: 0.55 },
  { type: "unresolved_topic", pattern: /\bstill need to\b|\bnot sure (yet )?(how|whether|if)\b|\btodo:?\b/i, confidence: 0.5 },
  { type: "project", pattern: /\bthe (project|platform|app|system) (is|will be)\b/i, confidence: 0.5 },
  { type: "fact", pattern: /\bmy (name|email|timezone|company) is\b/i, confidence: 0.75 },
];

function generateCandidateId(conversationId: string, index: number): string {
  return `candidate-${conversationId}-${index}`;
}

// Only user-authored sentences are scanned - the same reasoning as
// memory-candidate.ts's explicit-request path: content the USER wrote is a
// materially different trust level than content a model generated, and
// extracting "candidates" from the assistant's OWN historical replies
// would risk laundering model output into memory, which Objective F/I
// explicitly warn against.
export function extractCandidates(record: ConversationRecord): ExtractedCandidate[] {
  const candidates: ExtractedCandidate[] = [];
  let index = 0;

  for (const message of record.messages) {
    if (message.role !== "user") continue;

    const sentences = message.content.split(SENTENCE_SPLIT_PATTERN).filter((sentence) => sentence.trim().length > 0);
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      for (const rule of PATTERN_RULES) {
        if (rule.pattern.test(trimmed)) {
          candidates.push({
            id: generateCandidateId(record.conversationId, index),
            conversationId: record.id,
            type: rule.type,
            content: trimmed,
            confidence: rule.confidence,
            sourceExcerpt: trimmed,
            reason: `Matched a "${rule.type}" phrasing pattern in an imported conversation.`,
            reviewStatus: "pending",
          });
          index += 1;
          // One match per sentence - a sentence matching multiple patterns
          // (e.g. both "decided" and "goal") is tagged by whichever rule
          // is checked first (PATTERN_RULES order), not duplicated across
          // every matching category - keeps review lists conservative.
          break;
        }
      }
    }
  }

  return candidates;
}
