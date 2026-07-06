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

function OnboardingLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="text-sm text-slate-500">Loading Atlas...</div>
    </div>
  );
}

export default function OnboardingGate({ children }: Readonly<{ children: React.ReactNode }>) {
  const { isCloudSyncAvailable, isAuthLoading, user, syncStatus } = useCloudSync();
  const [onboardingCompleted, setOnboardingCompleted, hasLoadedOnboardingFlag] = useLocalStorageState<boolean>(STORAGE_KEYS.onboardingCompleted, false);
  const [hasMigrated, setHasMigrated, hasLoadedMigrationFlag] = useLocalStorageState<boolean>(STORAGE_KEYS.onboardingMigrated, false);
  const { attributes, setAttributes, hasLoaded: hasLoadedAttributes } = useAttributes();
  const { goalTree, hasLoaded: hasLoadedGoalTree } = useGoalTree();
  const { questDefinitions, isReady: isProgressionReady } = useProgression();
  const [hasReconciled, setHasReconciled] = useState(false);

  const isWaitingForCloudHydration = isCloudSyncAvailable && !isAuthLoading && Boolean(user) && syncStatus === "syncing";
  const isLocalStateLoaded = hasLoadedOnboardingFlag && hasLoadedMigrationFlag && hasLoadedAttributes && hasLoadedGoalTree && isProgressionReady;
  const canReconcile = !isAuthLoading && !isWaitingForCloudHydration && isLocalStateLoaded;

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

  if (!canReconcile || !hasReconciled) {
    return <OnboardingLoadingScreen />;
  }

  if (!onboardingCompleted) {
    return <OnboardingWizard onComplete={() => setOnboardingCompleted(true)} />;
  }

  return <>{children}</>;
}
