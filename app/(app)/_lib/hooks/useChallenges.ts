"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { Challenge } from "../types/challenge";

export function useChallenges() {
  const [challenges, setChallenges, hasLoaded] = useLocalStorageState<Challenge[]>(STORAGE_KEYS.challenges, []);

  return { challenges, setChallenges, hasLoaded } as const;
}
