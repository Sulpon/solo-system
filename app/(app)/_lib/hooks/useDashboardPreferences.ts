"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { createDefaultDashboardPreferences } from "../types/dashboard-preferences";

// Stores ONLY which Streaks/Achievements/Goals are visible on the Dashboard
// (see types/dashboard-preferences.ts) - every setter here writes a real,
// explicit array, so a first-time `null` default is never confused with a
// later deliberate "select nothing."
export function useDashboardPreferences() {
  const [preferences, setPreferences, hasLoaded] = useLocalStorageState(STORAGE_KEYS.dashboardPreferences, createDefaultDashboardPreferences());

  const setSelectedStreakIds = useCallback(
    (ids: ReadonlyArray<string>) => {
      setPreferences((current) => ({ ...current, selectedStreakIds: ids, updatedAt: new Date().toISOString() }));
    },
    [setPreferences],
  );

  const setSelectedAchievementIds = useCallback(
    (ids: ReadonlyArray<string>) => {
      setPreferences((current) => ({ ...current, selectedAchievementIds: ids, updatedAt: new Date().toISOString() }));
    },
    [setPreferences],
  );

  const setSelectedGoalIds = useCallback(
    (ids: ReadonlyArray<string>) => {
      setPreferences((current) => ({ ...current, selectedGoalIds: ids, updatedAt: new Date().toISOString() }));
    },
    [setPreferences],
  );

  return { preferences, hasLoaded, setSelectedStreakIds, setSelectedAchievementIds, setSelectedGoalIds } as const;
}
