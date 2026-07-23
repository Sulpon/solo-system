"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { WorkoutSession } from "../types/workout";

export function useWorkoutSessions() {
  const [sessions, setSessions, hasLoaded] = useLocalStorageState<WorkoutSession[]>(STORAGE_KEYS.workoutSessions, []);

  return { sessions, setSessions, hasLoaded } as const;
}
