import countriesData from "./data/countries.json";
import type { WorldCountry } from "../types/world-map";

// Generated from Atlas_World_Map_Per_City_Dungeons.xlsx by
// scripts/convert-world-map-excel.mjs - all 195 sovereign states. Never
// hand-edit this data; re-run the script if the Excel changes.
export const WORLD_COUNTRIES: ReadonlyArray<WorldCountry> = countriesData as WorldCountry[];

const COUNTRY_BY_ID = new Map(WORLD_COUNTRIES.map((country) => [country.id, country]));

export function getCountry(countryId: string): WorldCountry | null {
  return COUNTRY_BY_ID.get(countryId) ?? null;
}

export function getCountriesForContinent(continentId: string): WorldCountry[] {
  return WORLD_COUNTRIES.filter((country) => country.continentId === continentId);
}

const REGIONAL_INDICATOR_OFFSET = 127397; // "A" (0x41) -> Unicode Regional Indicator Symbol Letter A

// Derives the flag emoji from a real ISO-3166-1 alpha-2 code rather than
// storing 195 emoji strings in the generated seed - two Regional Indicator
// Symbol codepoints per the ISO2 letters.
export function getCountryFlagEmoji(iso2: string): string {
  if (!/^[A-Za-z]{2}$/.test(iso2)) {
    return "🏳️";
  }

  return String.fromCodePoint(...iso2.toUpperCase().split("").map((char) => char.charCodeAt(0) + REGIONAL_INDICATOR_OFFSET));
}
