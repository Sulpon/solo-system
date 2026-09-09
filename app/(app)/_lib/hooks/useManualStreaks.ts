"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { ManualStreak } from "../types/manual-streak";

function generateManualStreakId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "manual-streak-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export type ManualStreakDraft = Readonly<{ title: string; description?: string; currentStreak: number }>;

export function useManualStreaks() {
  const [manualStreaks, setManualStreaks, hasLoaded] = useLocalStorageState<ManualStreak[]>(STORAGE_KEYS.manualStreaks, []);

  const addManualStreak = useCallback(
    (draft: ManualStreakDraft) => {
      const now = new Date().toISOString();
      const streak: ManualStreak = { id: generateManualStreakId(), ...draft, createdAt: now, updatedAt: now };
      setManualStreaks((current) => [streak, ...current]);
      return streak;
    },
    [setManualStreaks],
  );

  const incrementManualStreak = useCallback(
    (id: string, by = 1) => {
      setManualStreaks((current) => current.map((streak) => (streak.id === id ? { ...streak, currentStreak: Math.max(0, streak.currentStreak + by), updatedAt: new Date().toISOString() } : streak)));
    },
    [setManualStreaks],
  );

  const setManualStreakValue = useCallback(
    (id: string, currentStreak: number) => {
      setManualStreaks((current) => current.map((streak) => (streak.id === id ? { ...streak, currentStreak: Math.max(0, Math.floor(currentStreak)), updatedAt: new Date().toISOString() } : streak)));
    },
    [setManualStreaks],
  );

  const deleteManualStreak = useCallback(
    (id: string) => {
      setManualStreaks((current) => current.filter((streak) => streak.id !== id));
    },
    [setManualStreaks],
  );

  return { manualStreaks, hasLoaded, addManualStreak, incrementManualStreak, setManualStreakValue, deleteManualStreak } as const;
}
