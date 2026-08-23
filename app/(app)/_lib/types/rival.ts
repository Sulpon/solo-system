import type { QuestCompletion } from "./quest";

// AI Rivals are fictional, simulated "other players" living on the World
// Map - never real people. Their identity (name/origin/personality/growth
// bias) is authored once and never mutated; their simulation state
// (RivalState below) is what actually evolves, one simulated day at a time,
// via rival-simulation-engine.ts. See world-map/rival-roster.ts for the 18
// authored identities.

export type RivalArchetype = "aggressive" | "consistent" | "unpredictable";

// All normalized 0-1. Author these directly per rival - they are the only
// thing that makes one rival behave differently from another; the
// simulation function itself never special-cases a specific rival.
export type RivalPersonality = Readonly<{
  activityRate: number;
  consistency: number;
  explorationRate: number;
  aggression: number;
  challengePreference: number;
  specialization: number;
  recoveryRate: number;
}>;

export type RivalIdentity = Readonly<{
  id: string;
  name: string;
  title: string;
  icon: string;
  originContinentId: string;
  originCountryId: string;
  // Real CategoryId (see types/category.ts) - the same catalog the
  // player's own Attributes use, not the World Map's flavor-only LifeDomain.
  primaryAttributeId: string;
  strength: string;
  weakness: string;
  archetype: RivalArchetype;
  personality: RivalPersonality;
  // CategoryId -> multiplier applied to attribute-XP distribution only
  // (never to a completion's own xpAwarded/mastery base) - see
  // rival-simulation-engine.ts. Configurable data, not a hardcoded formula.
  growthProfile: Readonly<Record<string, number>>;
  createdAt: string;
}>;

export type RivalDungeonAttempt = Readonly<{ attempts: number; cleared: boolean }>;
export type RivalBossAttempt = Readonly<{ attempts: number; defeated: boolean }>;

export type RivalHistoryEventType =
  | "level_up"
  | "mastery_tier"
  | "challenge_level_up"
  | "dungeon_cleared"
  | "boss_defeated"
  | "country_conquered"
  | "player_encounter";

export type RivalHistoryEvent = Readonly<{
  id: string;
  date: string;
  type: RivalHistoryEventType;
  label: string;
}>;

// The persisted "save file" for one rival - everything here is either an
// incrementally-maintained running total (mirrors what replaying full
// QuestCompletion history through the real batch engines would produce, see
// rival-simulation-engine.ts) or a small capped log. Deliberately NOT an
// unbounded completion history - see plan decision #3 (storage budget across
// 18 rivals synced via the cloud snapshot).
export type RivalState = Readonly<{
  identityId: string;
  totalXp: number;
  masteryXpByQuestId: Readonly<Record<string, number>>;
  streakByQuestId: Readonly<Record<string, number>>;
  lastCompletedDayKeyByQuestId: Readonly<Record<string, string>>;
  challengeStateByQuestId: Readonly<Record<string, Readonly<{ levelIndex: number; currentStreak: number }>>>;
  attributeXp: Readonly<Record<string, number>>;
  recentCompletions: ReadonlyArray<QuestCompletion>;
  currentContinentId: string;
  currentCountryId: string;
  countryProgress: Readonly<Record<string, number>>;
  conqueredCountryIds: ReadonlyArray<string>;
  dungeonAttempts: Readonly<Record<string, RivalDungeonAttempt>>;
  bossAttempts: Readonly<Record<string, RivalBossAttempt>>;
  // Forward-compat only - no Skill Tree exists yet, nothing reads this today.
  skillLevels?: Readonly<Record<string, number>>;
  history: ReadonlyArray<RivalHistoryEvent>;
  daysSinceStart: number;
  createdAt: string;
}>;

export type RivalEncounterStatus = "pending" | "active" | "player_win" | "rival_win" | "draw";

export type RivalEncounter = Readonly<{
  id: string;
  rivalId: string;
  countryId: string;
  date: string;
  playerSnapshot: Readonly<{ level: number; rank: string }>;
  rivalSnapshot: Readonly<{ level: number; rank: string }>;
  status: RivalEncounterStatus;
}>;
