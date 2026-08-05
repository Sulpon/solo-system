"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { DEFAULT_EXPERIENCE_ENTRIES } from "../types/profile-database";
import type { ExperienceEntry } from "../types/profile-database";

export function useExperienceEntries() {
  const [entries, setEntries, hasLoaded] = useLocalStorageState<ExperienceEntry[]>(STORAGE_KEYS.experienceEntries, [...DEFAULT_EXPERIENCE_ENTRIES]);

  return { entries, setEntries, hasLoaded } as const;
}
