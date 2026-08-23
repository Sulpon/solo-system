// Player Character v1 - real photos, real measurements, no rendering engine.
// The RPG layer (Level/Rank, elsewhere) reads from progression-store and is
// never allowed to alter any type here - appearance is grounded in real data
// only. See CharacterViewer.tsx for the read-only Level/Rank display.

export const CHARACTER_VIEWS = ["front", "left", "back", "right"] as const;
export type CharacterView = (typeof CHARACTER_VIEWS)[number];

// A real photo the user uploaded of themselves, stored via document-store.ts
// (photoId -> IndexedDB blob). One per view slot, replaceable.
export type ReferencePhoto = Readonly<{
  id: string;
  slot: CharacterView;
  photoId: string;
  uploadedAt: string;
}>;

// Type-only extension point for a future avatar-generation phase (section 11
// of the spec: never overwrite a ReferencePhoto with a generated image).
// Deliberately has no storage key, hook, or UI yet - nothing produces these,
// so a persisted-but-always-empty collection would be dead code.
export type GeneratedAvatar = Readonly<{
  id: string;
  slot: CharacterView;
  photoId: string;
  generatedAt: string;
  basis: string;
}>;

export type WardrobeCategory = "top" | "bottom" | "underwear" | "outerwear" | "footwear" | "accessory" | "other";

export type WardrobeItem = Readonly<{
  id: string;
  name: string;
  category: WardrobeCategory;
  brand?: string;
  color?: string;
  description?: string;
  photoId?: string;
  owned: boolean;
  createdAt: string;
  updatedAt: string;
}>;

export type EquipSlot = "top" | "bottom" | "underwear" | "outerwear" | "footwear" | "accessory";

export type EquippedItems = Partial<Record<EquipSlot, string>>;

export type Hairstyle = Readonly<{
  id: string;
  name: string;
  photoId?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}>;

export type CharacterProfile = Readonly<{
  view: CharacterView;
  updatedAt: string;
}>;

export const DEFAULT_CHARACTER_PROFILE: CharacterProfile = {
  view: "front",
  updatedAt: new Date(0).toISOString(),
};
