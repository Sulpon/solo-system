import dungeonsData from "./data/dungeons.json";
import { getCitiesForCountry } from "./cities";
import type { WorldDungeon } from "../types/world-map";

// Generated from Atlas_World_Map_Per_City_Dungeons.xlsx by
// scripts/convert-world-map-excel.mjs - 2925 rows: 4 Dungeons + 1 Boss for
// every one of the 585 cities, unlocked by that city's own progress
// independently (see engines/world-map-engine.ts). Never hand-edit this
// data; re-run the script if the Excel changes.
export const WORLD_DUNGEONS: ReadonlyArray<WorldDungeon> = dungeonsData as WorldDungeon[];

const DUNGEON_BY_ID = new Map(WORLD_DUNGEONS.map((dungeon) => [dungeon.id, dungeon]));

const DUNGEONS_BY_CITY = new Map<string, WorldDungeon[]>();
WORLD_DUNGEONS.forEach((dungeon) => {
  const list = DUNGEONS_BY_CITY.get(dungeon.cityId) ?? [];
  list.push(dungeon);
  DUNGEONS_BY_CITY.set(dungeon.cityId, list);
});
DUNGEONS_BY_CITY.forEach((list) => list.sort((a, b) => a.dungeonNumber - b.dungeonNumber));

export function getDungeon(dungeonId: string): WorldDungeon | null {
  return DUNGEON_BY_ID.get(dungeonId) ?? null;
}

// The 5 rows (4 Dungeons + Boss) for one city, in order.
export function getDungeonsForCity(cityId: string): WorldDungeon[] {
  return DUNGEONS_BY_CITY.get(cityId) ?? [];
}

export function getBossForCity(cityId: string): WorldDungeon | null {
  return getDungeonsForCity(cityId).find((dungeon) => dungeon.isBoss) ?? null;
}

// Every Dungeon/Boss across all of a country's cities, pooled together -
// used where something needs a country-wide view rather than one city's own
// ladder (e.g. the Rival simulation's simplified internal dungeon-attempt
// flavor, which operates at country granularity - see plan decision 7).
export function getDungeonsForCountry(countryId: string): WorldDungeon[] {
  return getCitiesForCountry(countryId).flatMap((city) => getDungeonsForCity(city.id));
}
