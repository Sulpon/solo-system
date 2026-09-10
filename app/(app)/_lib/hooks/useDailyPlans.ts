"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { DailyPlan, DailyPlanTaskAssignment } from "../types/daily-plan";
import type { EisenhowerQuadrant } from "../types/quest";

function emptyPlan(date: string, now: string): DailyPlan {
  return { date, locked: false, assignments: [], overrides: [], createdAt: now, updatedAt: now };
}

export function useDailyPlans() {
  const [plans, setPlans, hasLoaded] = useLocalStorageState<Record<string, DailyPlan>>(STORAGE_KEYS.dailyPlans, {});

  function getPlan(date: string): DailyPlan | undefined {
    return plans[date];
  }

  // Snapshots the given assignments as the authoritative plan for `date`.
  // Always captures a FRESH snapshot - re-locking after an unlock never
  // reuses the old (now stale) assignments array.
  function lockPlan(date: string, assignments: ReadonlyArray<DailyPlanTaskAssignment>) {
    const now = new Date().toISOString();
    setPlans((current) => {
      const existing = current[date];
      return { ...current, [date]: { ...(existing ?? emptyPlan(date, now)), locked: true, assignments: [...assignments], updatedAt: now } };
    });
  }

  // The deliberate "modify the plan" escape hatch - reverts to deriving
  // assignments live from each Task's current eisenhowerQuadrant until the
  // user locks again. Never deletes the overrides log.
  function unlockPlan(date: string) {
    setPlans((current) => {
      const existing = current[date];
      if (!existing) {
        return current;
      }
      return { ...current, [date]: { ...existing, locked: false, updatedAt: new Date().toISOString() } };
    });
  }

  function recordOverride(date: string, quadrant: EisenhowerQuadrant) {
    const now = new Date().toISOString();
    setPlans((current) => {
      const existing = current[date] ?? emptyPlan(date, now);
      return { ...current, [date]: { ...existing, overrides: [...existing.overrides, { quadrant, at: now }], updatedAt: now } };
    });
  }

  return { plans, getPlan, lockPlan, unlockPlan, recordOverride, hasLoaded } as const;
}
