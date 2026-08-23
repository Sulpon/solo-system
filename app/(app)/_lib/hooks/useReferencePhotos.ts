"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { deleteDocumentFile } from "../document-store";
import type { CharacterView, ReferencePhoto } from "../types/player-character";

function generateReferencePhotoId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "ref-photo-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export function useReferencePhotos() {
  const [photos, setPhotos, hasLoaded] = useLocalStorageState<ReferencePhoto[]>(STORAGE_KEYS.characterReferencePhotos, []);

  // One photo per slot - uploading a replacement deletes the old blob and
  // swaps the slot's entry, it never accumulates history for a view.
  const setSlotPhoto = useCallback(
    async (slot: CharacterView, photoId: string) => {
      const existing = photos.find((photo) => photo.slot === slot);
      if (existing) {
        await deleteDocumentFile(existing.photoId).catch(() => {});
      }

      const next: ReferencePhoto = { id: generateReferencePhotoId(), slot, photoId, uploadedAt: new Date().toISOString() };
      setPhotos((current) => [...current.filter((photo) => photo.slot !== slot), next]);
    },
    [photos, setPhotos],
  );

  const removeSlotPhoto = useCallback(
    async (slot: CharacterView) => {
      const existing = photos.find((photo) => photo.slot === slot);
      if (existing) {
        await deleteDocumentFile(existing.photoId).catch(() => {});
      }
      setPhotos((current) => current.filter((photo) => photo.slot !== slot));
    },
    [photos, setPhotos],
  );

  return { photos, setSlotPhoto, removeSlotPhoto, hasLoaded } as const;
}
