"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { DEFAULT_CHARACTER_PROFILE } from "../types/player-character";
import type { CharacterView } from "../types/player-character";

export function useCharacterProfile() {
  const [profile, setProfile, hasLoaded] = useLocalStorageState(STORAGE_KEYS.characterProfile, DEFAULT_CHARACTER_PROFILE);

  const setView = useCallback(
    (view: CharacterView) => {
      setProfile({ view, updatedAt: new Date().toISOString() });
    },
    [setProfile],
  );

  return { profile, setView, hasLoaded } as const;
}
