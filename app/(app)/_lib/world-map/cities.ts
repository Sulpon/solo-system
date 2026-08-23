import citiesData from "./data/cities.json";
import type { WorldCity } from "../types/world-map";

// Generated from Atlas_World_Map_Per_City_Dungeons.xlsx by
// scripts/convert-world-map-excel.mjs - 585 cities, 3 per country. Never
// hand-edit this data; re-run the script if the Excel changes.
export const WORLD_CITIES: ReadonlyArray<WorldCity> = citiesData as WorldCity[];

const CITY_BY_ID = new Map(WORLD_CITIES.map((city) => [city.id, city]));

export function getCity(cityId: string): WorldCity | null {
  return CITY_BY_ID.get(cityId) ?? null;
}

export function getCitiesForCountry(countryId: string): WorldCity[] {
  return WORLD_CITIES.filter((city) => city.countryId === countryId);
}
