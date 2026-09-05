"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { deleteDocumentFile } from "../document-store";
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

  const deleteEntriesForChallenge = useCallback(
    async (challengeId: string) => {
      const toDelete = entries.filter((entry) => entry.challengeId === challengeId && entry.photoId);
      await Promise.all(toDelete.map((entry) => deleteDocumentFile(entry.photoId as string).catch(() => {})));
      setEntries((current) => current.filter((entry) => entry.challengeId !== challengeId));
    },
    [entries, setEntries],
  );

  return { entries, getEntriesForChallenge, setEntryValue, setEntryPhoto, deleteEntriesForChallenge, hasLoaded } as const;
}
