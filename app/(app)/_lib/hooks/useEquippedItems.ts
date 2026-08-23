"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { EquipSlot, EquippedItems } from "../types/player-character";

export function useEquippedItems() {
  const [equipped, setEquipped, hasLoaded] = useLocalStorageState<EquippedItems>(STORAGE_KEYS.characterEquippedItems, {});

  const equip = useCallback(
    (slot: EquipSlot, itemId: string) => {
      setEquipped((current) => ({ ...current, [slot]: itemId }));
    },
    [setEquipped],
  );

  const unequip = useCallback(
    (slot: EquipSlot) => {
      setEquipped((current) => {
        const next = { ...current };
        delete next[slot];
        return next;
      });
    },
    [setEquipped],
  );

  return { equipped, equip, unequip, hasLoaded } as const;
}
