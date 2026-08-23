"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";

// The one piece of new persisted state World Map introduces: which Goal the
// map currently treats as "active" for character-position display. The
// user picks this explicitly (spec: "the user should be able to select an
// active Goal") - everything else about World Map is derived on read.
export function useWorldMapState() {
  const [selectedGoalId, setSelectedGoalId, hasLoaded] = useLocalStorageState<string | null>(STORAGE_KEYS.worldMapSelectedGoalId, null);

  return { selectedGoalId, setSelectedGoalId, hasLoaded } as const;
}
