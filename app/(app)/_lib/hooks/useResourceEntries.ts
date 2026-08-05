"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { ResourceEntry } from "../types/resource";

export function useResourceEntries() {
  const [entries, setEntries, hasLoaded] = useLocalStorageState<ResourceEntry[]>(STORAGE_KEYS.resourceEntries, []);

  return { entries, setEntries, hasLoaded } as const;
}
