"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { DEFAULT_EISENHOWER_QUADRANT_NAMES } from "../types/eisenhower-settings";
import type { EisenhowerQuadrantNames } from "../types/eisenhower-settings";
import type { EisenhowerQuadrant } from "../types/quest";

export function useEisenhowerSettings() {
  const [quadrantNames, setQuadrantNames, hasLoaded] = useLocalStorageState<EisenhowerQuadrantNames>(
    STORAGE_KEYS.eisenhowerQuadrantNames,
    DEFAULT_EISENHOWER_QUADRANT_NAMES,
  );

  function renameQuadrant(quadrant: EisenhowerQuadrant, name: string) {
    const trimmed = name.trim();
    setQuadrantNames((current) => ({ ...current, [quadrant]: trimmed || DEFAULT_EISENHOWER_QUADRANT_NAMES[quadrant] }));
  }

  return { quadrantNames, renameQuadrant, hasLoaded } as const;
}
