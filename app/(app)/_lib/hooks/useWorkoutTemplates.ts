"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { WorkoutTemplate } from "../types/workout";

export function useWorkoutTemplates() {
  const [templates, setTemplates, hasLoaded] = useLocalStorageState<WorkoutTemplate[]>(STORAGE_KEYS.workoutTemplates, []);

  return { templates, setTemplates, hasLoaded } as const;
}
