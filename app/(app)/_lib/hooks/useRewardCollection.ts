"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { UnlockedReward } from "../types/reward";

// Dedup-append, mirrors addActivityEvents in activity-events.ts - safe to
// call from an idempotent sync effect that may recompute the same unlock
// more than once before the id is persisted.
export function addUnlockedRewards(current: ReadonlyArray<UnlockedReward>, next: ReadonlyArray<UnlockedReward>): UnlockedReward[] {
  const byId = new Map<string, UnlockedReward>();

  for (const reward of [...current, ...next]) {
    byId.set(reward.id, reward);
  }

  return Array.from(byId.values()).sort((first, second) => new Date(second.unlockedAt).getTime() - new Date(first.unlockedAt).getTime());
}

export function useRewardCollection() {
  const [rewardCollection, setRewardCollection, hasLoaded] = useLocalStorageState<UnlockedReward[]>(STORAGE_KEYS.rewardCollection, []);

  const addRewards = useCallback(
    (rewards: ReadonlyArray<UnlockedReward>) => {
      if (rewards.length === 0) {
        return;
      }

      setRewardCollection((current) => addUnlockedRewards(current, rewards));
    },
    [setRewardCollection],
  );

  return { rewardCollection, setRewardCollection, addRewards, hasLoaded } as const;
}
