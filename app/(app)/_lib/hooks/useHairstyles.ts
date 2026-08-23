"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { deleteDocumentFile } from "../document-store";
import type { Hairstyle } from "../types/player-character";

function generateHairstyleId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "hairstyle-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export type HairstyleDraft = Readonly<{
  name: string;
  photoId?: string;
  notes?: string;
}>;

export function useHairstyles() {
  const [hairstyles, setHairstyles, hasLoaded] = useLocalStorageState<Hairstyle[]>(STORAGE_KEYS.hairstyles, []);

  const addHairstyle = useCallback(
    (draft: HairstyleDraft, makeActive = false) => {
      const hairstyle: Hairstyle = {
        id: generateHairstyleId(),
        name: draft.name,
        photoId: draft.photoId,
        notes: draft.notes,
        isActive: makeActive,
        createdAt: new Date().toISOString(),
      };

      setHairstyles((current) => (makeActive ? current.map((entry) => ({ ...entry, isActive: false })) : current).concat(hairstyle));
      return hairstyle;
    },
    [setHairstyles],
  );

  const updateHairstyle = useCallback(
    (id: string, patch: Partial<HairstyleDraft>) => {
      setHairstyles((current) => current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
    },
    [setHairstyles],
  );

  // Exactly one hairstyle is active at a time - never two, never zero once
  // at least one entry exists.
  const setActiveHairstyle = useCallback(
    (id: string) => {
      setHairstyles((current) => current.map((entry) => ({ ...entry, isActive: entry.id === id })));
    },
    [setHairstyles],
  );

  const deleteHairstyle = useCallback(
    async (id: string) => {
      const hairstyle = hairstyles.find((entry) => entry.id === id);
      if (hairstyle?.photoId) {
        await deleteDocumentFile(hairstyle.photoId).catch(() => {});
      }
      setHairstyles((current) => current.filter((entry) => entry.id !== id));
    },
    [hairstyles, setHairstyles],
  );

  return { hairstyles, addHairstyle, updateHairstyle, setActiveHairstyle, deleteHairstyle, hasLoaded } as const;
}
