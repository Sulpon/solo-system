"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { DEFAULT_SKILL_ENTRIES } from "../types/profile-database";
import type { SkillEntry } from "../types/profile-database";

export function useSkillEntries() {
  const [entries, setEntries, hasLoaded] = useLocalStorageState<SkillEntry[]>(STORAGE_KEYS.skillEntries, [...DEFAULT_SKILL_ENTRIES]);

  return { entries, setEntries, hasLoaded } as const;
}
