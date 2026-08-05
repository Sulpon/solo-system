"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { VacancyEntry } from "../types/vacancy";

// Entries written before "Next Action" was added won't have the field yet.
function normalizeVacancyEntry(entry: VacancyEntry): VacancyEntry {
  return entry.nextAction !== undefined ? entry : { ...entry, nextAction: "" };
}

export function useVacancyEntries() {
  const [entries, setEntries, hasLoaded] = useLocalStorageState<VacancyEntry[]>(STORAGE_KEYS.vacancyEntries, []);

  return { entries: entries.map(normalizeVacancyEntry), setEntries, hasLoaded } as const;
}
