import type { ConversationRecord, ConversationSource } from "./types";

// Phase 20 Objective J - a foundation for searching imported historical
// conversations. Deliberately NOT a vector database or embeddings pipeline
// (explicitly out of scope this phase) - a simple, deterministic,
// substring/keyword search over each record's title and message content.
// This is honest about what it is: it will not find semantically-related
// conversations that don't share vocabulary with the query. A future phase
// may add real embeddings/RAG on top of this same ConversationRecord
// shape without changing the shape itself.

export type ConversationSearchFilters = Readonly<{ source?: ConversationSource; after?: string; before?: string }>;

export type ConversationSearchResult = Readonly<{ record: ConversationRecord; matchCount: number }>;

function normalize(text: string): string {
  return text.toLowerCase();
}

function countMatches(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

function matchesFilters(record: ConversationRecord, filters: ConversationSearchFilters | undefined): boolean {
  if (!filters) return true;
  if (filters.source && record.source !== filters.source) return false;
  if (filters.after && record.createdAt < filters.after) return false;
  if (filters.before && record.createdAt > filters.before) return false;
  return true;
}

// Never fabricates relevance beyond an honest keyword match count - a
// query with zero matches returns an empty array, never a "best guess."
export function searchConversations(records: ReadonlyArray<ConversationRecord>, query: string, filters?: ConversationSearchFilters): ReadonlyArray<ConversationSearchResult> {
  const normalizedQuery = normalize(query.trim());
  if (!normalizedQuery) return [];

  const results: ConversationSearchResult[] = [];
  for (const record of records) {
    if (!matchesFilters(record, filters)) continue;

    const titleMatches = countMatches(normalize(record.title), normalizedQuery);
    const contentMatches = record.messages.reduce((total, message) => total + countMatches(normalize(message.content), normalizedQuery), 0);
    const matchCount = titleMatches + contentMatches;

    if (matchCount > 0) results.push({ record, matchCount });
  }

  return results.sort((a, b) => b.matchCount - a.matchCount);
}
