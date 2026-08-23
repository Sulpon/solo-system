"use client";

import { useEffect, useRef } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { runCatchUpSimulation, detectEncounters, mergeEncounters } from "../world-map/rival-world-store";
import type { RivalEncounter, RivalState } from "../types/rival";

// Mounted once per World Map session (see WorldMapPageClient.tsx). On first
// load it catches the simulated world up to "now" (see rival-world-store.ts
// for the bounded, idempotent catch-up logic), then just serves the
// persisted state - no per-render or per-tick simulation cost.
export function useRivalWorld(playerActiveCountryId: string | null, playerLevel: number) {
  const [statesById, setStatesById, hasLoadedStates] = useLocalStorageState<Record<string, RivalState>>(STORAGE_KEYS.worldRivalState, {});
  const [encounters, setEncounters, hasLoadedEncounters] = useLocalStorageState<RivalEncounter[]>(STORAGE_KEYS.worldRivalEncounters, []);
  const [lastSimulatedAt, setLastSimulatedAt, hasLoadedClock] = useLocalStorageState<string | null>(STORAGE_KEYS.worldRivalLastSimulatedAt, null);
  const hasCaughtUpRef = useRef(false);

  const hasLoaded = hasLoadedStates && hasLoadedEncounters && hasLoadedClock;

  useEffect(() => {
    if (!hasLoaded || hasCaughtUpRef.current) {
      return;
    }

    hasCaughtUpRef.current = true;

    const result = runCatchUpSimulation(statesById, lastSimulatedAt, playerActiveCountryId, playerLevel);

    if (result.didAdvance) {
      setStatesById(result.states);
    }

    if (result.newEncounters.length > 0) {
      setEncounters((current) => mergeEncounters(current, result.newEncounters));
    }

    if (result.nextLastSimulatedAt !== lastSimulatedAt) {
      setLastSimulatedAt(result.nextLastSimulatedAt);
    }
    // Intentionally run once per mount (catch-up is a load-time event, not a
    // per-render effect) - see hasCaughtUpRef above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoaded]);

  // Separate from the once-per-mount catch-up above: cheap (O(rival count)),
  // so it's fine to re-run whenever the player's active country or rival
  // positions change - covers linking a Goal to a Rival-occupied country
  // mid-session, not just at load time.
  useEffect(() => {
    if (!hasLoaded || !hasCaughtUpRef.current) {
      return;
    }

    const fresh = detectEncounters(statesById, playerActiveCountryId, playerLevel);

    if (fresh.length > 0) {
      setEncounters((current) => mergeEncounters(current, fresh));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoaded, playerActiveCountryId, statesById]);

  return { statesById, encounters, hasLoaded } as const;
}
