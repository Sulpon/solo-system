"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { JarvisPlan } from "../jarvis/types";

const NON_TERMINAL_STATUSES: ReadonlyArray<JarvisPlan["status"]> = ["proposed", "active", "paused"];

// Phase 18 - the ONE persistence point for JARVIS plans, following the same
// convention every other Atlas collection hook already uses
// (useLocalStorageState -> real localStorage -> automatically swept into
// the cloud snapshot by atlas-snapshot.ts's "menace-" prefix scan, and
// merged by id via sync/merge-atlas-snapshot.ts). A plan survives closing
// JARVIS, navigating away, and a full refresh/restart because it lives here,
// not in useJarvisConversation's React state.
export function useJarvisPlans() {
  const [plans, setPlans, hasLoaded] = useLocalStorageState<JarvisPlan[]>(STORAGE_KEYS.jarvisPlans, []);

  // The most recently touched plan, terminal or not - a JUST-completed/
  // failed/cancelled plan stays visible (with its final step statuses and
  // no action controls, see JarvisPlanCard's isTerminal) until a NEW plan
  // supersedes it, rather than vanishing the instant it settles. Only one
  // plan is ever WORKABLE at a time (see startPlan's supersede logic
  // below), so there's still never more than one plan the user can act on.
  const activePlan = useMemo(() => {
    if (plans.length === 0) return null;
    return [...plans].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  }, [plans]);

  // A freshly proposed plan supersedes any prior unresolved one - Atlas
  // never asks the user to juggle two concurrent plans. The superseded
  // plan is cancelled (not deleted) so its history/outcome stays visible.
  const startPlan = useCallback(
    (plan: JarvisPlan) => {
      setPlans((current) => {
        const superseded = current.map((existing) =>
          NON_TERMINAL_STATUSES.includes(existing.status)
            ? { ...existing, status: "cancelled" as const, updatedAt: new Date().toISOString() }
            : existing,
        );
        return [...superseded, plan];
      });
    },
    [setPlans],
  );

  const updatePlan = useCallback(
    (planId: string, updater: (plan: JarvisPlan) => JarvisPlan) => {
      setPlans((current) => current.map((plan) => (plan.id === planId ? updater(plan) : plan)));
    },
    [setPlans],
  );

  return { plans, activePlan, hasLoaded, startPlan, updatePlan };
}
