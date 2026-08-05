"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { QuestReflection } from "../types/reflection";

export function useQuestReflections() {
  const [reflections, setReflections, hasLoaded] = useLocalStorageState<QuestReflection[]>(STORAGE_KEYS.questReflections, []);

  return { reflections, setReflections, hasLoaded } as const;
}
