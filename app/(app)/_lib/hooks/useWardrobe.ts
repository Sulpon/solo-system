"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { deleteDocumentFile } from "../document-store";
import type { WardrobeCategory, WardrobeItem } from "../types/player-character";

function generateWardrobeItemId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "wardrobe-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export type WardrobeItemDraft = Readonly<{
  name: string;
  category: WardrobeCategory;
  brand?: string;
  color?: string;
  description?: string;
  photoId?: string;
  owned?: boolean;
}>;

export function useWardrobe() {
  const [items, setItems, hasLoaded] = useLocalStorageState<WardrobeItem[]>(STORAGE_KEYS.wardrobeItems, []);

  const addItem = useCallback(
    (draft: WardrobeItemDraft) => {
      const now = new Date().toISOString();
      const item: WardrobeItem = {
        id: generateWardrobeItemId(),
        name: draft.name,
        category: draft.category,
        brand: draft.brand,
        color: draft.color,
        description: draft.description,
        photoId: draft.photoId,
        owned: draft.owned ?? true,
        createdAt: now,
        updatedAt: now,
      };

      setItems((current) => [...current, item]);
      return item;
    },
    [setItems],
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<WardrobeItemDraft>) => {
      setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item)));
    },
    [setItems],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      const item = items.find((entry) => entry.id === id);
      if (item?.photoId) {
        await deleteDocumentFile(item.photoId).catch(() => {});
      }
      setItems((current) => current.filter((entry) => entry.id !== id));
    },
    [items, setItems],
  );

  return { items, addItem, updateItem, deleteItem, hasLoaded } as const;
}
