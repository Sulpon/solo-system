"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { ResearchNoteEntry } from "../types/research-note";

export function useResearchNoteEntries() {
  const [entries, setEntries, hasLoaded] = useLocalStorageState<ResearchNoteEntry[]>(STORAGE_KEYS.researchNoteEntries, []);

  return { entries, setEntries, hasLoaded } as const;
}
