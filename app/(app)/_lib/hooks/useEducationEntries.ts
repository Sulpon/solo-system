"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { DEFAULT_EDUCATION_ENTRIES } from "../types/profile-database";
import type { EducationEntry } from "../types/profile-database";

export function useEducationEntries() {
  const [entries, setEntries, hasLoaded] = useLocalStorageState<EducationEntry[]>(STORAGE_KEYS.educationEntries, [...DEFAULT_EDUCATION_ENTRIES]);

  return { entries, setEntries, hasLoaded } as const;
}
