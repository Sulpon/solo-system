"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { ExperimentEntry } from "../types/experiment";

export function useExperimentEntries() {
  const [entries, setEntries, hasLoaded] = useLocalStorageState<ExperimentEntry[]>(STORAGE_KEYS.experimentEntries, []);

  return { entries, setEntries, hasLoaded } as const;
}
