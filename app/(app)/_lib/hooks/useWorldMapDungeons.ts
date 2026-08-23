"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { WorldMapDungeonProgress } from "../engines/world-map-engine";

// Persists exactly one real fact per Dungeon: when it was completed.
// Locked/available are always derived live from city progress - see
// getDungeonStatus in engines/world-map-engine.ts - so there is nothing else
// to store here.
export function useWorldMapDungeons() {
  const [dungeonProgress, setDungeonProgress, hasLoaded] = useLocalStorageState<WorldMapDungeonProgress>(STORAGE_KEYS.worldMapDungeonProgress, {});

  function completeDungeon(dungeonId: string, completedAt: string = new Date().toISOString()) {
    setDungeonProgress((current) => (current[dungeonId] ? current : { ...current, [dungeonId]: completedAt }));
  }

  return { dungeonProgress, completeDungeon, hasLoaded } as const;
}
