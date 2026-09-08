"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { CalendarPlacement } from "../types/calendar-placement";

function generatePlacementId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "placement-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export function useCalendarPlacements() {
  const [placements, setPlacements, hasLoaded] = useLocalStorageState<CalendarPlacement[]>(STORAGE_KEYS.calendarPlacements, []);

  const addPlacement = useCallback(
    (questId: string, date: string) => {
      setPlacements((current) => {
        if (current.some((placement) => placement.questId === questId && placement.date === date)) {
          return current;
        }
        return [...current, { id: generatePlacementId(), questId, date, createdAt: new Date().toISOString() }];
      });
    },
    [setPlacements],
  );

  const removePlacement = useCallback(
    (id: string) => {
      setPlacements((current) => current.filter((placement) => placement.id !== id));
    },
    [setPlacements],
  );

  // Placements reference a quest by id only - deleting the quest should
  // clean up any placements pointing at it rather than leaving orphans.
  const removePlacementsForQuest = useCallback(
    (questId: string) => {
      setPlacements((current) => current.filter((placement) => placement.questId !== questId));
    },
    [setPlacements],
  );

  return { placements, addPlacement, removePlacement, removePlacementsForQuest, hasLoaded } as const;
}
