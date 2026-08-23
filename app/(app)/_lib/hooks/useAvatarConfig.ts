"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { DEFAULT_AVATAR_CONFIG } from "../types/player-character";

export function useAvatarConfig() {
  const [avatarConfig, setAvatarConfig, hasLoaded] = useLocalStorageState(STORAGE_KEYS.characterAvatarConfig, DEFAULT_AVATAR_CONFIG);

  const setMeshVisible = useCallback(
    (meshName: string, visible: boolean) => {
      setAvatarConfig((current) => ({
        ...current,
        hiddenMeshNames: visible ? current.hiddenMeshNames.filter((name) => name !== meshName) : [...current.hiddenMeshNames.filter((name) => name !== meshName), meshName],
        updatedAt: new Date().toISOString(),
      }));
    },
    [setAvatarConfig],
  );

  return { avatarConfig, setMeshVisible, hasLoaded } as const;
}
