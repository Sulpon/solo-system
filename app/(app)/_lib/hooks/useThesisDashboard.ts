"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { DEFAULT_THESIS_DASHBOARD } from "../types/thesis-dashboard";
import type { ThesisDashboardData } from "../types/thesis-dashboard";

export function useThesisDashboard() {
  const [dashboard, setDashboard, hasLoaded] = useLocalStorageState<ThesisDashboardData>(STORAGE_KEYS.thesisDashboard, DEFAULT_THESIS_DASHBOARD);

  return { dashboard, setDashboard, hasLoaded } as const;
}
