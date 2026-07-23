"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { BodyweightEntry } from "../types/bodyweight";

export function useBodyweight() {
  const [entries, setEntries, hasLoaded] = useLocalStorageState<BodyweightEntry[]>(STORAGE_KEYS.bodyweightEntries, []);

  return { entries, setEntries, hasLoaded } as const;
}
