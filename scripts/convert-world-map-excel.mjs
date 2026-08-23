// One-time (re-runnable) conversion: Atlas_World_Map_Per_City_Dungeons.xlsx ->
// normalized JSON seed data under app/(app)/_lib/world-map/data/. Dev-only -
// `xlsx` is never imported by the running app, only by this script. Re-run
// with `node scripts/convert-world-map-excel.mjs` if the Excel is updated.
import XLSX from "xlsx";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXCEL_PATH = path.join(__dirname, "..", "Atlas_World_Map_Per_City_Dungeons.xlsx");
const OUT_DIR = path.join(__dirname, "..", "app", "(app)", "_lib", "world-map", "data");

const CONTINENT_ID_BY_NAME = {
  Africa: "africa",
  Europe: "europe",
  "North America": "north-america",
  Asia: "asia",
  "South America": "south-america",
  Oceania: "oceania",
};

function readSheet(wb, name) {
  return XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: null });
}

function toStringOrUndefined(value) {
  if (value === null || value === undefined || value === "") return undefined;
  return String(value);
}

function main() {
  const wb = XLSX.readFile(EXCEL_PATH);

  const countryRows = readSheet(wb, "Countries");
  const cityRows = readSheet(wb, "Cities");
  const dungeonRows = readSheet(wb, "City Dungeons");

  const countries = countryRows.map((row) => ({
    id: row.country_id,
    name: row.country,
    iso2: row.iso2,
    continentId: CONTINENT_ID_BY_NAME[row.continent] ?? null,
    domain: row.real_world_association,
    goalFit: row.atlas_goal_fit,
    cityIds: String(row.city_ids ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
    description: row.country_notes,
  }));

  const cities = cityRows.map((row) => ({
    id: row.city_id,
    countryId: row.country_id,
    name: row.city_name,
    cityAspect: row.city_aspect,
    description: row.city_description,
    mapRole: row.map_role,
  }));

  const dungeons = dungeonRows.map((row) => ({
    id: row.dungeon_id,
    cityId: row.city_id,
    countryId: row.country_id,
    dungeonNumber: row.dungeon_number,
    name: row.dungeon_name,
    type: row.type,
    unlockProgressPct: row.unlock_progress_pct,
    isBoss: Boolean(row.is_boss) || row.type === "BOSS",
    bossRank: toStringOrUndefined(row.boss_rank),
    requirementGoalIds: [],
    requirementSkillIds: [],
    xpReward: Number(row.xp_reward) || 0,
    masteryReward: Number(row.mastery_reward) || 0,
    description: row.description,
    whyItMatters: row.why_it_matters,
    travelMemoryHook: row.travel_memory_hook,
    photoQuery: row.photo_query,
    photoSearchUrl: row.photo_url,
    photoSource: row.photo_source,
    verificationStatus: row.verification_status === "CURATED" ? "curated" : "needs_verification",
  }));

  // Sanity checks - fail loudly rather than silently emit a broken seed.
  const countryIdSet = new Set(countries.map((c) => c.id));
  const cityIdSet = new Set(cities.map((c) => c.id));
  const orphanCities = cities.filter((c) => !countryIdSet.has(c.countryId));
  const orphanDungeons = dungeons.filter((d) => !cityIdSet.has(d.cityId));
  if (orphanCities.length > 0) throw new Error(`${orphanCities.length} cities reference an unknown countryId`);
  if (orphanDungeons.length > 0) throw new Error(`${orphanDungeons.length} dungeons reference an unknown cityId`);
  if (countries.length !== 195) throw new Error(`Expected 195 countries, got ${countries.length}`);
  if (cities.length !== 585) throw new Error(`Expected 585 cities, got ${cities.length}`);
  if (dungeons.length !== 2925) throw new Error(`Expected 2925 dungeons, got ${dungeons.length}`);

  writeFileSync(path.join(OUT_DIR, "countries.json"), JSON.stringify(countries));
  writeFileSync(path.join(OUT_DIR, "cities.json"), JSON.stringify(cities));
  writeFileSync(path.join(OUT_DIR, "dungeons.json"), JSON.stringify(dungeons));

  console.log(`Wrote ${countries.length} countries, ${cities.length} cities, ${dungeons.length} dungeons.`);
}

main();
