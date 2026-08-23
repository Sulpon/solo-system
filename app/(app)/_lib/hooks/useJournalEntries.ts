"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { DailyJournalEntry, JournalPhoto } from "../types/journal";

function generateJournalEntryId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "journal-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export type JournalEntryDraft = Readonly<{
  text: string;
  photos: ReadonlyArray<JournalPhoto>;
  tags?: ReadonlyArray<string>;
}>;

export function useJournalEntries() {
  const [entries, setEntries, hasLoaded] = useLocalStorageState<DailyJournalEntry[]>(STORAGE_KEYS.journalEntries, []);

  const getEntryForDate = useCallback((date: string) => entries.find((entry) => entry.date === date) ?? null, [entries]);

  // One entry per date - writing for a date that already has one edits it in
  // place (same id, updatedAt bumped) rather than creating a duplicate.
  const upsertEntryForDate = useCallback(
    (date: string, draft: JournalEntryDraft) => {
      const now = new Date().toISOString();
      let saved: DailyJournalEntry | null = null;

      setEntries((current) => {
        const existing = current.find((entry) => entry.date === date);
        const next: DailyJournalEntry = existing
          ? { ...existing, text: draft.text, photos: draft.photos, tags: draft.tags, updatedAt: now }
          : { id: generateJournalEntryId(), date, text: draft.text, photos: draft.photos, tags: draft.tags, createdAt: now, updatedAt: now };
        saved = next;

        return existing ? current.map((entry) => (entry.date === date ? next : entry)) : [...current, next];
      });

      return saved as DailyJournalEntry | null;
    },
    [setEntries],
  );

  const deleteEntry = useCallback(
    (id: string) => {
      setEntries((current) => current.filter((entry) => entry.id !== id));
    },
    [setEntries],
  );

  return { entries, setEntries, getEntryForDate, upsertEntryForDate, deleteEntry, hasLoaded } as const;
}
