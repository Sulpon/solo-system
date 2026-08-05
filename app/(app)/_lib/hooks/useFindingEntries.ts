"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { FindingEntry } from "../types/finding";

export function useFindingEntries() {
  const [entries, setEntries, hasLoaded] = useLocalStorageState<FindingEntry[]>(STORAGE_KEYS.findingEntries, []);

  return { entries, setEntries, hasLoaded } as const;
}
