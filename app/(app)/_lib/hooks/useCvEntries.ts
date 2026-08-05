"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { DEFAULT_CV_ENTRIES } from "../types/cv";
import type { CvEntry } from "../types/cv";

// CVs created before document uploads existed won't have a `documents`
// field - default it in memory rather than assuming every stored entry
// matches the current shape.
function normalizeCvEntry(entry: CvEntry): CvEntry {
  return entry.documents ? entry : { ...entry, documents: [] };
}

export function useCvEntries() {
  const [entries, setEntries, hasLoaded] = useLocalStorageState<CvEntry[]>(STORAGE_KEYS.cvEntries, [...DEFAULT_CV_ENTRIES]);

  return { entries: entries.map(normalizeCvEntry), setEntries, hasLoaded } as const;
}
