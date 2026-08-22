"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { RealLifeReward } from "../types/real-life-reward";

function generateRealLifeRewardId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "real-life-reward-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export type RealLifeRewardDraft = Readonly<{
  title: string;
  description?: string;
  milestone: string;
  linkedQuestId?: string | null;
  streakThreshold?: number;
  estimatedValue?: number;
}>;

export function useRealLifeRewards() {
  const [rewards, setRewards, hasLoaded] = useLocalStorageState<RealLifeReward[]>(STORAGE_KEYS.realLifeRewards, []);

  const addReward = useCallback(
    (draft: RealLifeRewardDraft) => {
      const now = new Date().toISOString();
      const reward: RealLifeReward = {
        id: generateRealLifeRewardId(),
        title: draft.title,
        description: draft.description,
        milestone: draft.milestone,
        linkedQuestId: draft.linkedQuestId ?? null,
        streakThreshold: draft.streakThreshold,
        estimatedValue: draft.estimatedValue,
        redeemed: false,
        redeemedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      setRewards((current) => [...current, reward]);
      return reward;
    },
    [setRewards],
  );

  const updateReward = useCallback(
    (id: string, patch: Partial<RealLifeRewardDraft>) => {
      setRewards((current) =>
        current.map((reward) => (reward.id === id ? { ...reward, ...patch, updatedAt: new Date().toISOString() } : reward)),
      );
    },
    [setRewards],
  );

  const deleteReward = useCallback(
    (id: string) => {
      setRewards((current) => current.filter((reward) => reward.id !== id));
    },
    [setRewards],
  );

  const setRedeemed = useCallback(
    (id: string, redeemed: boolean) => {
      setRewards((current) =>
        current.map((reward) =>
          reward.id === id
            ? { ...reward, redeemed, redeemedAt: redeemed ? new Date().toISOString() : null, updatedAt: new Date().toISOString() }
            : reward,
        ),
      );
    },
    [setRewards],
  );

  return { rewards, setRewards, addReward, updateReward, deleteReward, setRedeemed, hasLoaded } as const;
}
