"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { deleteDocumentFile } from "../document-store";
import { entryKey, QUEST_LINKED_ENTRY_SOURCE, QUEST_LINKED_ENTRY_VALUE, type QuestLinkedEntryKey } from "../engines/challenge-quest-sync";
import type { ChallengeEntry } from "../types/challenge";

function generateEntryId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "entry-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export function useChallengeEntries() {
  const [entries, setEntries, hasLoaded] = useLocalStorageState<ChallengeEntry[]>(STORAGE_KEYS.challengeEntries, []);

  const getEntriesForChallenge = useCallback((challengeId: string) => entries.filter((entry) => entry.challengeId === challengeId), [entries]);

  // One entry per (metricId, date) - logging the same cell again replaces it
  // rather than accumulating history, matching BodyweightPanel's upsert-by-
  // date pattern used elsewhere in this app.
  const setEntryValue = useCallback(
    (challengeId: string, metricId: string, date: string, value: number | string | undefined) => {
      const now = new Date().toISOString();
      setEntries((current) => {
        const existing = current.find((entry) => entry.challengeId === challengeId && entry.metricId === metricId && entry.date === date);

        if (value === undefined || value === "") {
          return current.filter((entry) => !(entry.challengeId === challengeId && entry.metricId === metricId && entry.date === date));
        }

        if (existing) {
          return current.map((entry) => (entry.id === existing.id ? { ...entry, value, updatedAt: now } : entry));
        }

        const entry: ChallengeEntry = { id: generateEntryId(), challengeId, metricId, date, value, createdAt: now, updatedAt: now };
        return [...current, entry];
      });
    },
    [setEntries],
  );

  const setEntryPhoto = useCallback(
    async (challengeId: string, metricId: string, date: string, photoId: string | undefined) => {
      const now = new Date().toISOString();
      const existing = entries.find((entry) => entry.challengeId === challengeId && entry.metricId === metricId && entry.date === date);

      if (existing?.photoId && existing.photoId !== photoId) {
        await deleteDocumentFile(existing.photoId).catch(() => {});
      }

      if (!photoId) {
        setEntries((current) => current.filter((entry) => entry.id !== existing?.id));
        return;
      }

      if (existing) {
        setEntries((current) => current.map((entry) => (entry.id === existing.id ? { ...entry, photoId, updatedAt: now } : entry)));
        return;
      }

      const entry: ChallengeEntry = { id: generateEntryId(), challengeId, metricId, date, photoId, createdAt: now, updatedAt: now };
      setEntries((current) => [...current, entry]);
    },
    [entries, setEntries],
  );

  // Makes the quest-derived entries exactly match `desired`, in ONE write.
  //
  // Scoped twice over, deliberately: it only considers entries whose
  // metric is currently quest-linked (metricIds), and within those only
  // entries it created itself (source === "quest"). A day the user logged
  // by hand has no source and is never added, changed or removed - an
  // explicit value always beats a derived one. Unlinking a metric drops it
  // out of metricIds, so previously derived days are left in place rather
  // than being deleted out from under the user.
  //
  // Returns nothing and writes nothing when already in sync, so the
  // effect that calls it on every render cannot loop.
  const reconcileQuestEntries = useCallback(
    (desired: ReadonlyArray<QuestLinkedEntryKey>, metricIds: ReadonlySet<string>) => {
      const desiredKeys = new Set(desired.map(entryKey));

      setEntries((current) => {
        const now = new Date().toISOString();

        const kept = current.filter((entry) => {
          const isOurs = entry.source === QUEST_LINKED_ENTRY_SOURCE && metricIds.has(entry.metricId);
          return !isOurs || desiredKeys.has(entryKey(entry));
        });

        const existingKeys = new Set(kept.map(entryKey));
        const added: ChallengeEntry[] = desired
          .filter((key) => !existingKeys.has(entryKey(key)))
          .map((key) => ({
            id: generateEntryId(),
            challengeId: key.challengeId,
            metricId: key.metricId,
            date: key.date,
            value: QUEST_LINKED_ENTRY_VALUE,
            source: QUEST_LINKED_ENTRY_SOURCE,
            createdAt: now,
            updatedAt: now,
          }));

        // Same array identity when nothing changed - useLocalStorageState
        // would otherwise write and broadcast on every pass.
        if (added.length === 0 && kept.length === current.length) {
          return current;
        }

        return [...kept, ...added];
      });
    },
    [setEntries],
  );

  const deleteEntriesForChallenge = useCallback(
    async (challengeId: string) => {
      const toDelete = entries.filter((entry) => entry.challengeId === challengeId && entry.photoId);
      await Promise.all(toDelete.map((entry) => deleteDocumentFile(entry.photoId as string).catch(() => {})));
      setEntries((current) => current.filter((entry) => entry.challengeId !== challengeId));
    },
    [entries, setEntries],
  );

  return { entries, getEntriesForChallenge, setEntryValue, setEntryPhoto, reconcileQuestEntries, deleteEntriesForChallenge, hasLoaded } as const;
}
