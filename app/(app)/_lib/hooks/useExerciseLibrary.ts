"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { createWorkoutId } from "../workout-storage";
import type { ExerciseLibraryEntry, ExerciseUnit } from "../types/workout";

export function useExerciseLibrary() {
  const [exercises, setExercises, hasLoaded] = useLocalStorageState<ExerciseLibraryEntry[]>(STORAGE_KEYS.exerciseLibrary, []);

  // Adds a newly-named exercise, or refreshes an existing one's unit/muscle
  // group to the latest usage - matched case-insensitively so "Push Ups" and
  // "push ups" resolve to the same saved entry.
  const rememberExercise = useCallback(
    (name: string, unit: ExerciseUnit, muscleGroup?: string) => {
      const trimmed = name.trim();

      if (!trimmed) {
        return;
      }

      setExercises((current) => {
        const existingIndex = current.findIndex((entry) => entry.name.toLowerCase() === trimmed.toLowerCase());

        if (existingIndex === -1) {
          return [...current, { id: createWorkoutId("exlib"), name: trimmed, unit, muscleGroup: muscleGroup?.trim() || undefined }];
        }

        const next = [...current];
        const existing = next[existingIndex];
        next[existingIndex] = { ...existing, unit, muscleGroup: muscleGroup?.trim() || existing.muscleGroup };
        return next;
      });
    },
    [setExercises],
  );

  return { exercises, rememberExercise, hasLoaded } as const;
}
