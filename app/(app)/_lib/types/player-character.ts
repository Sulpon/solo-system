// Player Character v1 - real photos, real measurements, no rendering engine.
// The RPG layer (Level/Rank, elsewhere) reads from progression-store and is
// never allowed to alter any type here - appearance is grounded in real data
// only. See AvatarSection.tsx for the read-only Level/Rank display.

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

// The real, rigged 3D avatar (see AvatarViewer.tsx) - generated once via
// Avaturn from the user's reference photos, exported as a glTF binary with 5
// named skinned meshes sharing one skeleton: avaturn_body, avaturn_hair_0,
// avaturn_hair_1, avaturn_shoes_0, avaturn_look_0 (the equipped outfit). The
// GLB file itself is treated as read-only; this config is the only thing
// that changes, and only along dimensions the model actually supports today
// (per-mesh visibility) - no morph targets or swappable garment meshes exist
// in this model, so no body/hair-shape/clothing-swap fields are invented
// here. avatarModelId + modelUrl are the seam a future regenerated avatar
// (a new GLB from updated reference photos) would swap through without
// touching anything else that reads this config.
export type AvatarConfig = Readonly<{
  avatarModelId: string;
  modelUrl: string;
  // Named meshes hidden from their GLB default (empty = the model's own
  // default appearance, exactly as exported).
  hiddenMeshNames: ReadonlyArray<string>;
  updatedAt: string;
}>;

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  avatarModelId: "avaturn-current",
  modelUrl: "/avatars/avaturn-current.glb",
  hiddenMeshNames: [],
  updatedAt: new Date(0).toISOString(),
};

// The mesh names above that make sense to let the user show/hide - the body
// mesh is excluded since hiding it would just show nothing underneath (this
// model has no separate skin/underwear layer).
export const AVATAR_TOGGLEABLE_MESHES: ReadonlyArray<{ meshName: string; label: string }> = [
  { meshName: "avaturn_hair_0", label: "Hair (layer 1)" },
  { meshName: "avaturn_hair_1", label: "Hair (layer 2)" },
  { meshName: "avaturn_shoes_0", label: "Shoes" },
  { meshName: "avaturn_look_0", label: "Outfit" },
];
