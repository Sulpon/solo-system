// The World Map is a read-oriented visualization layer - it never stores
// Goal or Quest data, only its own small config (continents/countries,
// developer-curated, mirrors achievement-definitions.ts) and one piece of
// UI preference (which Goal is "active" on the map). Progress, state, and
// statistics are all derived live from the existing Goal Tree.

export type LifeDomain = "body" | "mind" | "trading" | "spirit" | "discipline" | "adventure" | "unknown";

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
  continentId: string;
  name: string;
  flag: string;
  domain: string;
  description: string;
  position: MapPosition;
  // Placeholders for future systems - referenced by id only, never resolved
  // or rendered as real content yet. See world-map-engine.ts.
  relatedSkillIds?: ReadonlyArray<string>;
  dungeonIds?: ReadonlyArray<string>;
  bossId?: string;
}>;

// The single state ladder driving both the label and the fog-of-war visual
// treatment - see quest-mastery-engine.ts-style "one derived value, many
// uses" convention already established elsewhere in this app.
export type CountryProgressState = "unknown" | "explored" | "occupied" | "dominated" | "conquered";

export type CountryBossStatus = "locked" | "available" | "defeated";

export type CountryBoss = Readonly<{
  id: string;
  countryId: string;
  name: string;
  description: string;
  // Free-text placeholders for now - will become structured requirements
  // (Quest Mastery level, Skill level, Dungeon completion, ...) once those
  // systems exist.
  requirements: ReadonlyArray<string>;
  rewardId?: string;
  status: CountryBossStatus;
}>;

export type DungeonType = "training" | "challenge" | "boss";
export type DungeonStatus = "locked" | "available" | "completed";

export type WorldDungeon = Readonly<{
  id: string;
  countryId: string;
  name: string;
  type: DungeonType;
  difficulty: number;
  requiredSkillIds?: ReadonlyArray<string>;
  recommendedSkillIds?: ReadonlyArray<string>;
  objective: string;
  status: DungeonStatus;
}>;

export type RivalArchetype = Readonly<{
  id: string;
  name: string;
  description: string;
  icon: string;
  baseLevel: number;
  // One level gained roughly every this-many days, deterministically from
  // the calendar date - never random, never able to leap ahead arbitrarily.
  daysPerLevel: number;
  statProfile: Readonly<Record<string, number>>;
}>;
