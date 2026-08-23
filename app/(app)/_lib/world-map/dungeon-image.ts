import type { WorldDungeon } from "../types/world-map";

export type DungeonImageResult = Readonly<{
  kind: "search-reference";
  searchUrl: string;
  source: string;
  alt: string;
}>;

// No direct hotlinkable photo exists anywhere in the seed data - every
// photo_url in the Excel is a Wikimedia Commons *search* link, not an
// image (confirmed: 2925/2925 rows, none are a real image URL). This is
// the single seam a future pass can swap to return a real cached/CDN photo
// from, without touching any component that renders a Dungeon.
export function getDungeonImage(dungeon: WorldDungeon): DungeonImageResult {
  return { kind: "search-reference", searchUrl: dungeon.photoSearchUrl, source: dungeon.photoSource, alt: dungeon.name };
}
