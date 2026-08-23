// The World Map is a read-oriented visualization layer over the real Atlas
// systems (Goal Tree, Quests, XP, Rivals). Hierarchy: Continent (fixed
// life-domain mental map) -> Country (real, all 195) -> City (a country's
// control points, 3 seeded per country) -> Dungeon/Boss (each city's own
// independent 4 Dungeons + 1 Boss). Country/city progress is always derived
// live from the Goal Tree, never stored - see engines/world-map-engine.ts.

export type LifeDomain = "body" | "mind" | "career-money" | "discipline" | "spirit-identity" | "life-exploration" | "unknown";

export type MapPosition = Readonly<{ x: number; y: number }>;

export type WorldContinent = Readonly<{
  id: string;
  name: string;
  domain: LifeDomain;
  domainLabel: string;
  description: string;
  icon: string;
  position: MapPosition;
  order: number;
}>;

export type WorldCountry = Readonly<{
  id: string;
  name: string;
  iso2: string;
  continentId: string;
  // The Excel's "real-world association" - a short life-domain flavor
  // description (e.g. "Resilience / conditioning"), not the Attribute
  // catalog. See rival-roster.ts for the same LifeDomain-vs-real-CategoryId
  // distinction already resolved for Rivals.
  domain: string;
  goalFit: string;
  cityIds: ReadonlyArray<string>;
  description: string;
}>;

export type WorldCity = Readonly<{
  id: string;
  countryId: string;
  name: string;
  cityAspect: string;
  description: string;
  mapRole: string;
  // Real per-city coordinates are not in the source data (585 of them) -
  // stays a real, optional extension point. Absent today; when unset the UI
  // computes a deterministic layout position instead of inventing precision.
  coordinates?: MapPosition;
}>;

// The single state ladder driving both the label and the fog-of-war visual
// treatment. "contested" is a multi-party overlay (the player and/or one or
// more Rivals each holding meaningful real progress in the same country)
// rather than a percentage band - see getCountryOwnership / isCountryContested
// in world-map-engine.ts.
export type CountryProgressState = "unknown" | "explored" | "occupied" | "dominated" | "conquered" | "contested";

export type CityProgressState = "unknown" | "explored" | "occupied" | "dominated" | "conquered";

export type DungeonType = "DUNGEON_1" | "DUNGEON_2" | "DUNGEON_3" | "DUNGEON_4" | "BOSS";
export type DungeonStatus = "locked" | "available" | "completed";
export type DungeonVerificationStatus = "curated" | "needs_verification";

// Boss is a WorldDungeon with isBoss:true (dungeonNumber 5, type "BOSS"),
// not a separate type - the Excel itself models it this way (Atlas Data
// Model's WorldBoss key fields are a strict subset of what's here), and the
// UI renders the isBoss row with the stronger Boss Card presentation.
export type WorldDungeon = Readonly<{
  id: string;
  cityId: string;
  countryId: string;
  dungeonNumber: number;
  name: string;
  type: DungeonType;
  unlockProgressPct: number;
  isBoss: boolean;
  bossRank?: string;
  // Data-driven requirement references - real Goal/Skill ids, never
  // hardcoded into the UI. Empty in the seed (none authored yet); the
  // requirements engine supports them the moment any exist.
  requirementGoalIds: ReadonlyArray<string>;
  requirementSkillIds: ReadonlyArray<string>;
  xpReward: number;
  masteryReward: number;
  description: string;
  whyItMatters: string;
  travelMemoryHook: string;
  photoQuery: string;
  photoSearchUrl: string;
  photoSource: string;
  verificationStatus: DungeonVerificationStatus;
}>;

export type WorldMapPosition = Readonly<{
  continentId: string;
  countryId: string;
  cityId?: string;
}>;
