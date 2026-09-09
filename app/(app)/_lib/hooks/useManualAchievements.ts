"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { ManualAchievement } from "../types/manual-achievement";

function generateManualAchievementId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "manual-achievement-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export type ManualAchievementDraft = Readonly<{
  title: string;
  description?: string;
  icon: ManualAchievement["icon"];
  category?: string;
  achievedAt?: string;
}>;

export function useManualAchievements() {
  const [manualAchievements, setManualAchievements, hasLoaded] = useLocalStorageState<ManualAchievement[]>(STORAGE_KEYS.manualAchievements, []);

  const addManualAchievement = useCallback(
    (draft: ManualAchievementDraft) => {
      const now = new Date().toISOString();
      const achievement: ManualAchievement = { id: generateManualAchievementId(), ...draft, createdAt: now, updatedAt: now };
      setManualAchievements((current) => [achievement, ...current]);
      return achievement;
    },
    [setManualAchievements],
  );

  const deleteManualAchievement = useCallback(
    (id: string) => {
      setManualAchievements((current) => current.filter((achievement) => achievement.id !== id));
    },
    [setManualAchievements],
  );

  return { manualAchievements, hasLoaded, addManualAchievement, deleteManualAchievement } as const;
}
