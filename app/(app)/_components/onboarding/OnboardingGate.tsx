"use client";

import { useEffect, useState } from "react";
import { useAttributes } from "../../_lib/hooks/useAttributes";
import { useCloudSync } from "../../_lib/hooks/useCloudSync";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { useLocalStorageState } from "../../_lib/hooks/use-local-storage-state";
import { useProgression } from "../../_lib/hooks/useProgression";
import { getLegacyDefaultAttributes, hasLegacyAtlasData } from "../../_lib/onboarding";
import { STORAGE_KEYS } from "../../_lib/storage-keys";
import OnboardingWizard from "./OnboardingWizard";

// How long the loading shell may stay up before Atlas stops pretending it's
// still making progress and says what's actually stuck. Comfortably past
// every real startup path: the local reads resolve on the first effect
// tick, and the one genuinely network-bound gate (Supabase auth) is itself
// bounded at CLOUD_SYNC_TIMEOUT_MS (8s) - see cloud-sync-store.tsx. Past
// this, something is wrong rather than slow.
const LOADING_STALL_MS = 12_000;

function OnboardingLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="text-sm text-slate-500">Loading Atlas...</div>
    </div>
  );
}

// Replaces the indefinite "Loading Atlas..." shell once startup has clearly
// stalled. A silent, permanent loading screen was a real reported failure
// mode with no way to tell a slow start from a dead one - this turns it
// into something self-diagnosing (which gate is still blocking) with a way
// out, without ever faking readiness: it never lets the app through, it
// just stops hiding the problem.
function OnboardingStalledScreen({ blockedBy }: Readonly<{ blockedBy: ReadonlyArray<string> }>) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/70 p-6 text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">Atlas</p>
        <h1 className="mt-2 text-lg font-black text-white">Atlas is taking longer than expected to start.</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Your local data is safe and untouched. Atlas does not need an internet connection, an account, or an AI provider to run - if this
          persists, the details below are the useful part to report.
        </p>

        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Still waiting on</p>
          <ul className="mt-1.5 space-y-1 text-xs text-slate-300">
            {blockedBy.map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
        >
          Reload Atlas
        </button>
      </div>
    </div>
  );
}

// TEMPORARY diagnostic instrumentation - see cloud-sync-store.tsx's
// authDiag and this milestone's report. Console logging (inspectable via
// DevTools or the CDP technique already used throughout this
// investigation) is enough here; no file-based logging needed on the
// frontend side.
function gateDiag(message: string) {
  console.log(`[Atlas][OnboardingGate] ${message}`);
}

export default function OnboardingGate({ children }: Readonly<{ children: React.ReactNode }>) {
  const { isCloudSyncAvailable, isAuthLoading, user, syncStatus } = useCloudSync();
  const [onboardingCompleted, setOnboardingCompleted, hasLoadedOnboardingFlag] = useLocalStorageState<boolean>(STORAGE_KEYS.onboardingCompleted, false);
  const [hasMigrated, setHasMigrated, hasLoadedMigrationFlag] = useLocalStorageState<boolean>(STORAGE_KEYS.onboardingMigrated, false);
  const { attributes, setAttributes, hasLoaded: hasLoadedAttributes } = useAttributes();
  const { goalTree, hasLoaded: hasLoadedGoalTree } = useGoalTree();
  const { questDefinitions, isReady: isProgressionReady } = useProgression();
  const [hasReconciled, setHasReconciled] = useState(false);
  const [hasStalled, setHasStalled] = useState(false);

  const isWaitingForCloudHydration = isCloudSyncAvailable && !isAuthLoading && Boolean(user) && syncStatus === "syncing";
  const isLocalStateLoaded = hasLoadedOnboardingFlag && hasLoadedMigrationFlag && hasLoadedAttributes && hasLoadedGoalTree && isProgressionReady;
  const canReconcile = !isAuthLoading && !isWaitingForCloudHydration && isLocalStateLoaded;

  // TEMPORARY diagnostic instrumentation (see gateDiag's own comment) -
  // logs exactly which flag(s) are still keeping OnboardingLoadingScreen on
  // screen, whenever that set changes, so a stuck "Loading Atlas..." report
  // can be traced to a specific cause instead of guessed at.
  useEffect(() => {
    if (canReconcile && hasReconciled) {
      gateDiag("gate cleared - rendering the real app");
      return;
    }

    gateDiag(
      `still blocked: isAuthLoading=${isAuthLoading} isWaitingForCloudHydration=${isWaitingForCloudHydration} ` +
        `isLocalStateLoaded=${isLocalStateLoaded} (onboardingFlag=${hasLoadedOnboardingFlag} migrationFlag=${hasLoadedMigrationFlag} ` +
        `attributes=${hasLoadedAttributes} goalTree=${hasLoadedGoalTree} progression=${isProgressionReady}) hasReconciled=${hasReconciled}`,
    );
  }, [
    canReconcile,
    hasReconciled,
    isAuthLoading,
    isWaitingForCloudHydration,
    isLocalStateLoaded,
    hasLoadedOnboardingFlag,
    hasLoadedMigrationFlag,
    hasLoadedAttributes,
    hasLoadedGoalTree,
    isProgressionReady,
  ]);

  // Arms once, on mount, and only ever fires while the gate is still
  // blocked - a normal start clears the gate long before this and the
  // cleanup cancels it. Deliberately does NOT force the app through: it
  // only swaps the silent loading shell for a diagnostic (see
  // OnboardingStalledScreen).
  useEffect(() => {
    if (canReconcile && hasReconciled) {
      return;
    }

    const timer = window.setTimeout(() => {
      gateDiag(`startup STALLED after ${LOADING_STALL_MS}ms - showing the diagnostic screen`);
      setHasStalled(true);
    }, LOADING_STALL_MS);

    return () => window.clearTimeout(timer);
  }, [canReconcile, hasReconciled]);

  useEffect(() => {
    if (hasReconciled || !canReconcile) {
      return;
    }

    // One-time migration for installs that pre-date onboarding: if this device already has
    // real Atlas data the first time this check ever runs, treat it as already onboarded.
    // Gated on `hasMigrated` (separate from `onboardingCompleted`) so that explicitly
    // restarting onboarding later isn't immediately re-completed by this same check.
    if (!hasMigrated) {
      if (!onboardingCompleted && hasLegacyAtlasData(goalTree, questDefinitions, attributes)) {
        if (attributes.length === 0) {
          setAttributes(getLegacyDefaultAttributes());
        }

        setOnboardingCompleted(true);
      }

      setHasMigrated(true);
    }

    setHasReconciled(true);
  }, [attributes, canReconcile, goalTree, hasMigrated, hasReconciled, onboardingCompleted, questDefinitions, setAttributes, setHasMigrated, setOnboardingCompleted]);

  const isBlocked = !canReconcile || !hasReconciled;

  if (isBlocked) {
    if (!hasStalled) {
      return <OnboardingLoadingScreen />;
    }

    const blockedBy: string[] = [];
    if (isAuthLoading) blockedBy.push("Account check (cloud sync sign-in state)");
    if (isWaitingForCloudHydration) blockedBy.push("Cloud sync download");
    if (!hasLoadedOnboardingFlag) blockedBy.push("Local setup flag");
    if (!hasLoadedMigrationFlag) blockedBy.push("Local migration flag");
    if (!hasLoadedAttributes) blockedBy.push("Attributes");
    if (!hasLoadedGoalTree) blockedBy.push("Goal tree");
    if (!isProgressionReady) blockedBy.push("Quests and progression");
    if (blockedBy.length === 0) blockedBy.push("Final startup step");

    return <OnboardingStalledScreen blockedBy={blockedBy} />;
  }

  if (!onboardingCompleted) {
    return <OnboardingWizard onComplete={() => setOnboardingCompleted(true)} />;
  }

  return <>{children}</>;
}
