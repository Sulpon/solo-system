"use client";

import { useEffect, useRef } from "react";
import { useBodyweight } from "./useBodyweight";
import { useReferencePhotos } from "./useReferencePhotos";
import { useWardrobe } from "./useWardrobe";
import { useHairstyles } from "./useHairstyles";
import { useEquippedItems } from "./useEquippedItems";
import { useCharacterProfile } from "./useCharacterProfile";
import { useAvatarConfig } from "./useAvatarConfig";
import { getLocalDayKey } from "../local-day";
import type { BodyweightEntry } from "../types/bodyweight";

const DEFAULT_UNDERWEAR_NAME = "Black Boxer Shorts";
const DEFAULT_HAIRSTYLE_NAME = "Current";

// Composes every independently-persisted Player Character collection into
// one object (see types/player-character.ts). Each sub-collection still owns
// its own storage key - this hook is a read/seed convenience, not a second
// source of truth.
//
// Seeding runs exactly once, only into genuinely empty collections, and only
// with real values the user supplied (175cm/61kg, "Black Boxer Shorts",
// "Current" hairstyle) - never invented measurements, never touching an
// existing real bodyweight history entry.
export function useCharacter() {
  const bodyweight = useBodyweight();
  const referencePhotos = useReferencePhotos();
  const wardrobe = useWardrobe();
  const hairstyles = useHairstyles();
  const equippedItems = useEquippedItems();
  const characterProfile = useCharacterProfile();
  const avatarConfig = useAvatarConfig();

  const hasLoaded =
    bodyweight.hasLoaded &&
    referencePhotos.hasLoaded &&
    wardrobe.hasLoaded &&
    hairstyles.hasLoaded &&
    equippedItems.hasLoaded &&
    characterProfile.hasLoaded &&
    avatarConfig.hasLoaded;

  const hasSeededRef = useRef(false);

  useEffect(() => {
    if (!hasLoaded || hasSeededRef.current) {
      return;
    }
    hasSeededRef.current = true;

    if (bodyweight.entries.length === 0) {
      const now = new Date().toISOString();
      const entry: BodyweightEntry = { id: `bw-seed-${Date.now()}`, date: getLocalDayKey(), weight: 61, unit: "kg", heightCm: 175, createdAt: now };
      bodyweight.setEntries([entry]);
    }

    if (wardrobe.items.length === 0) {
      const item = wardrobe.addItem({ name: DEFAULT_UNDERWEAR_NAME, category: "underwear", owned: true });
      equippedItems.equip("underwear", item.id);
    }

    if (hairstyles.hairstyles.length === 0) {
      hairstyles.addHairstyle({ name: DEFAULT_HAIRSTYLE_NAME }, true);
    }
    // Seeding is a one-time first-load effect keyed on hasLoaded flipping
    // true - intentionally not re-running when the underlying collections
    // change from user edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoaded]);

  const activeHairstyle = hairstyles.hairstyles.find((entry) => entry.isActive) ?? null;
  const latestMeasurement = [...bodyweight.entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] ?? null;

  return {
    hasLoaded,
    bodyweight,
    referencePhotos,
    wardrobe,
    hairstyles,
    equippedItems,
    characterProfile,
    avatarConfig,
    activeHairstyle,
    latestMeasurement,
  } as const;
}
