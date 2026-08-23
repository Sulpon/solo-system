// The original 26-country World Map seed (v1/v2) used kebab-case ids, and
// the AI Rivals feature persisted Rival state against those same ids. The
// new 195-country seed (generated from the Excel) uses snake_case ids, and
// "usa" specifically becomes "united_states" (not a mechanical case change).
// Any already-persisted Goal.worldMapLocationId or RivalState country id
// must resolve through this table so real historical progress isn't
// silently orphaned by the rebuild. Only entries whose id actually differs
// are listed - everything else in the old 26-country set is unchanged.
export const LEGACY_COUNTRY_ID_ALIASES: Readonly<Record<string, string>> = {
  "united-kingdom": "united_kingdom",
  usa: "united_states",
  "south-africa": "south_africa",
  "south-korea": "south_korea",
  "new-zealand": "new_zealand",
};

// Resolves a possibly-legacy country id to its current id. Ids that were
// never aliased (already-current, or simply unknown) pass through unchanged.
export function resolveCountryId(countryId: string): string {
  return LEGACY_COUNTRY_ID_ALIASES[countryId] ?? countryId;
}
