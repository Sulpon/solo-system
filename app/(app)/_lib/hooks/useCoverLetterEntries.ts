"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { DEFAULT_COVER_LETTER_ENTRIES } from "../types/cover-letter";
import type { CoverLetterEntry } from "../types/cover-letter";

export function useCoverLetterEntries() {
  const [entries, setEntries, hasLoaded] = useLocalStorageState<CoverLetterEntry[]>(STORAGE_KEYS.coverLetterEntries, [...DEFAULT_COVER_LETTER_ENTRIES]);

  return { entries, setEntries, hasLoaded } as const;
}
