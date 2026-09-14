"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { normalizeChatGptExport } from "../ai-core/conversation-history/chatgpt-import";
import { extractCandidates } from "../ai-core/conversation-history/candidate-extraction";
import { searchConversations, type ConversationSearchFilters } from "../ai-core/conversation-history/search";
import type { ConversationRecord, ExtractedCandidate } from "../ai-core/conversation-history/types";

// Phase 20 Objectives H/I/J - the ONE place imported conversation history
// is persisted, following the exact same useLocalStorageState pattern
// every other Atlas collection uses (see useNotes.ts) - not a second
// persistence mechanism, just a new collection under it. Two separate
// arrays (conversationHistory / conversationHistoryCandidates) keep SOURCE
// CONVERSATION and EXTRACTED CANDIDATE as genuinely distinct collections
// (Objective I) - importing never mutates a record after it's written, and
// accepting/dismissing a candidate never touches the source record.

export function useConversationHistory() {
  const [conversations, setConversations, hasLoadedConversations] = useLocalStorageState<ConversationRecord[]>(STORAGE_KEYS.conversationHistory, []);
  const [candidates, setCandidates, hasLoadedCandidates] = useLocalStorageState<ExtractedCandidate[]>(STORAGE_KEYS.conversationHistoryCandidates, []);

  // Objective H/I - the staged pipeline: raw export -> normalize -> real
  // ConversationRecords (appended, never replacing existing history) ->
  // deterministic candidate extraction -> pending candidates for review.
  // Re-importing the same export is safe: normalizeChatGptExport's ids are
  // deterministic from the export's own conversation_id, so re-running
  // this against an unchanged file produces the same ids again - a
  // dedupe-by-id merge (the same convention every other Atlas collection's
  // cloud sync already uses) keeps this idempotent.
  const importChatGptExport = useCallback(
    (raw: unknown) => {
      const imported = normalizeChatGptExport(raw);

      setConversations((current) => {
        const byId = new Map(current.map((record) => [record.id, record]));
        for (const record of imported) byId.set(record.id, record);
        return [...byId.values()];
      });

      const extracted = imported.flatMap((record) => extractCandidates(record));
      setCandidates((current) => {
        const byId = new Map(current.map((candidate) => [candidate.id, candidate]));
        for (const candidate of extracted) if (!byId.has(candidate.id)) byId.set(candidate.id, candidate);
        return [...byId.values()];
      });

      return { importedConversations: imported.length, extractedCandidates: extracted.length };
    },
    [setConversations, setCandidates],
  );

  const search = useCallback((query: string, filters?: ConversationSearchFilters) => searchConversations(conversations, query, filters), [conversations]);

  const pendingCandidates = candidates.filter((candidate) => candidate.reviewStatus === "pending");

  // Objective I - "user review" before Atlas memory. Accepting only marks
  // the candidate reviewed; it deliberately does NOT auto-create a Note or
  // any other Atlas entity by itself (that would reintroduce automatic
  // persistence of model/import-derived content through the back door) -
  // a future review UI decides what a reviewer does with an accepted
  // candidate's content, e.g. by handing it to the existing explicit
  // "remember that" -> Note path.
  const reviewCandidate = useCallback(
    (id: string, status: "accepted" | "dismissed") => {
      setCandidates((current) => current.map((candidate) => (candidate.id === id ? { ...candidate, reviewStatus: status } : candidate)));
    },
    [setCandidates],
  );

  return { conversations, candidates, pendingCandidates, hasLoaded: hasLoadedConversations && hasLoadedCandidates, importChatGptExport, search, reviewCandidate };
}
