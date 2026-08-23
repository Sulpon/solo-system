import type { Quest, QuestCadence, QuestChallengeConfig } from "../types/quest";
import type { RivalArchetype, RivalIdentity, RivalPersonality } from "../types/rival";

// The real Attribute catalog (see mock/categories.ts) - not the World Map's
// flavor-only LifeDomain. Rival primary/secondary attributes and growth
// coefficients target these 5 ids so they feed the exact same per-attribute
// leveling the player's own Attributes use.
const REAL_CATEGORY_ORDER = ["discipline", "career", "trading", "physical-health", "self-development"] as const;
type RealCategoryId = (typeof REAL_CATEGORY_ORDER)[number];

// Trading x1.50, next x1.15, next x1.05, then x0.95, x0.85 - mirrors the
// literal coefficient table from the request, applied to whichever 5 real
// categories a rival's primary/secondary picks resolve to. Configurable
// per-rival data, never a hardcoded branch in the simulation engine.
const COEFFICIENT_LADDER = [1.5, 1.15, 1.05, 0.95, 0.85] as const;

function buildGrowthProfile(primary: RealCategoryId, secondaries: readonly [RealCategoryId, RealCategoryId]): Readonly<Record<string, number>> {
  const rest = REAL_CATEGORY_ORDER.filter((id) => id !== primary && !secondaries.includes(id));
  const ordered = [primary, ...secondaries, ...rest];
  const profile: Record<string, number> = {};
  ordered.forEach((id, index) => {
    profile[id] = COEFFICIENT_LADDER[index];
  });
  return profile;
}

// ---------------------------------------------------------------------------
// Virtual Quest catalog - real Quest-typed objects (see types/quest.ts), so
// the exact same createQuestCompletion/getQuestMasteryXP/calculateQuestStreak/
// deriveChallengeProgress engines the player uses work unmodified on a
// rival's own completions. Ids are namespaced per rival so nothing collides
// with the player's real Quest list.
// ---------------------------------------------------------------------------

type QuestTemplate = Readonly<{ slug: string; title: string; xp: number; cadence: QuestCadence; challenge?: QuestChallengeConfig }>;

const CHALLENGE_5_10_15: QuestChallengeConfig = { enabled: true, levels: [{ target: 5, xp: 10 }, { target: 10, xp: 20 }, { target: 15, xp: 35 }], requiredStreak: 5 };

const QUEST_TEMPLATES: Readonly<Record<RealCategoryId, ReadonlyArray<QuestTemplate>>> = {
  trading: [
    { slug: "backtest", title: "Backtest Strategy", xp: 18, cadence: "daily", challenge: CHALLENGE_5_10_15 },
    { slug: "trading-rules", title: "Trading Rules Review", xp: 12, cadence: "daily" },
    { slug: "journal-trade", title: "Journal Trade", xp: 10, cadence: "daily" },
    { slug: "market-report", title: "Read Market Report", xp: 8, cadence: "daily" },
  ],
  discipline: [
    { slug: "cold-shower", title: "Cold Shower", xp: 8, cadence: "daily", challenge: CHALLENGE_5_10_15 },
    { slug: "no-instagram", title: "No Instagram", xp: 10, cadence: "daily" },
    { slug: "meditation", title: "Meditation", xp: 10, cadence: "daily" },
    { slug: "no-snooze", title: "No Snooze", xp: 8, cadence: "daily" },
  ],
  "physical-health": [
    { slug: "workout", title: "Workout", xp: 20, cadence: "daily", challenge: CHALLENGE_5_10_15 },
    { slug: "run", title: "Run", xp: 15, cadence: "daily" },
    { slug: "mobility", title: "Stretch / Mobility", xp: 8, cadence: "daily" },
    { slug: "sleep", title: "Sleep 8 Hours", xp: 10, cadence: "daily" },
  ],
  "self-development": [
    { slug: "deep-work", title: "Deep Work Session", xp: 18, cadence: "daily", challenge: CHALLENGE_5_10_15 },
    { slug: "read", title: "Read 30 Minutes", xp: 10, cadence: "daily" },
    { slug: "language", title: "Learn Language", xp: 12, cadence: "daily" },
    { slug: "journal-reflection", title: "Journal Reflection", xp: 8, cadence: "daily" },
  ],
  career: [
    { slug: "portfolio-work", title: "Portfolio Work", xp: 18, cadence: "daily", challenge: CHALLENGE_5_10_15 },
    { slug: "skill-practice", title: "Skill Practice", xp: 15, cadence: "daily" },
    { slug: "networking", title: "Networking Outreach", xp: 12, cadence: "daily" },
    { slug: "study", title: "Study Session", xp: 10, cadence: "daily" },
  ],
};

function buildQuestCatalog(rivalId: string, primary: RealCategoryId, secondaries: readonly [RealCategoryId, RealCategoryId], createdAt: string): Quest[] {
  const picks: ReadonlyArray<{ categoryId: RealCategoryId; template: QuestTemplate }> = [
    ...QUEST_TEMPLATES[primary].map((template) => ({ categoryId: primary, template })),
    { categoryId: secondaries[0], template: QUEST_TEMPLATES[secondaries[0]][0] },
    { categoryId: secondaries[1], template: QUEST_TEMPLATES[secondaries[1]][0] },
  ];

  return picks.map(({ categoryId, template }) => ({
    id: `rival-${rivalId}-${template.slug}`,
    title: template.title,
    categoryId,
    xp: template.xp,
    cadence: template.cadence,
    status: "active",
    challenge: template.challenge,
    createdAt,
    updatedAt: createdAt,
  }));
}

// ---------------------------------------------------------------------------
// 18 authored rivals, 3 per continent (one of each archetype), carried over
// from the earlier static roster's names/titles/origins. Fictional people -
// never celebrities, public figures, or real individuals.
// ---------------------------------------------------------------------------

type RivalSeed = Readonly<{
  id: string; name: string; title: string; icon: string;
  originContinentId: string; originCountryId: string;
  primary: RealCategoryId; secondaries: readonly [RealCategoryId, RealCategoryId];
  strength: string; weakness: string;
  archetype: RivalArchetype;
  personality: RivalPersonality;
}>;

const RIVAL_SEEDS: ReadonlyArray<RivalSeed> = [
  // Europe -> mostly Mind-flavored origins
  { id: "sophie-laurent", name: "Sophie Laurent", title: "The Philosopher", icon: "🧠", originContinentId: "europe", originCountryId: "france", primary: "self-development", secondaries: ["career", "discipline"], strength: "Reading", weakness: "Aggression", archetype: "consistent", personality: { activityRate: 0.68, consistency: 0.86, explorationRate: 0.38, aggression: 0.28, challengePreference: 0.55, specialization: 0.78, recoveryRate: 0.8 } },
  { id: "daniel-weber", name: "Daniel Weber", title: "The Analyst", icon: "📐", originContinentId: "europe", originCountryId: "germany", primary: "discipline", secondaries: ["career", "trading"], strength: "Logic", weakness: "Spontaneity", archetype: "aggressive", personality: { activityRate: 0.92, consistency: 0.72, explorationRate: 0.8, aggression: 0.88, challengePreference: 0.85, specialization: 0.9, recoveryRate: 0.55 } },
  { id: "eleni-papadaki", name: "Eleni Papadaki", title: "The Sage", icon: "📜", originContinentId: "europe", originCountryId: "greece", primary: "career", secondaries: ["self-development", "discipline"], strength: "Wisdom", weakness: "Focus", archetype: "unpredictable", personality: { activityRate: 0.4, consistency: 0.35, explorationRate: 0.5, aggression: 0.35, challengePreference: 0.4, specialization: 0.45, recoveryRate: 0.5 } },

  // North America -> Trading continent, all 3 trading-primary (thematic)
  { id: "alex-morgan", name: "Alex Morgan", title: "The Strategist", icon: "♟️", originContinentId: "north-america", originCountryId: "united_states", primary: "trading", secondaries: ["discipline", "career"], strength: "Strategy", weakness: "Adaptability", archetype: "consistent", personality: { activityRate: 0.88, consistency: 0.93, explorationRate: 0.45, aggression: 0.35, challengePreference: 0.75, specialization: 0.92, recoveryRate: 0.85 } },
  { id: "ryan-coleman", name: "Ryan Coleman", title: "The Riskmaster", icon: "🛡️", originContinentId: "north-america", originCountryId: "canada", primary: "trading", secondaries: ["discipline", "physical-health"], strength: "Risk Management", weakness: "Consistency", archetype: "unpredictable", personality: { activityRate: 0.55, consistency: 0.42, explorationRate: 0.55, aggression: 0.5, challengePreference: 0.5, specialization: 0.55, recoveryRate: 0.45 } },
  { id: "elena-cruz", name: "Elena Cruz", title: "The Reader", icon: "👁️", originContinentId: "north-america", originCountryId: "mexico", primary: "trading", secondaries: ["self-development", "career"], strength: "Market Psychology", weakness: "Discipline", archetype: "aggressive", personality: { activityRate: 0.75, consistency: 0.58, explorationRate: 0.72, aggression: 0.78, challengePreference: 0.7, specialization: 0.65, recoveryRate: 0.5 } },

  // Africa -> mostly Body-flavored origins
  { id: "thabo-nkosi", name: "Thabo Nkosi", title: "The Warrior", icon: "🛡️", originContinentId: "africa", originCountryId: "south_africa", primary: "physical-health", secondaries: ["discipline", "career"], strength: "Strength", weakness: "Patience", archetype: "unpredictable", personality: { activityRate: 0.5, consistency: 0.4, explorationRate: 0.5, aggression: 0.55, challengePreference: 0.5, specialization: 0.5, recoveryRate: 0.5 } },
  { id: "amara-wanjiru", name: "Amara Wanjiru", title: "The Runner", icon: "🏃", originContinentId: "africa", originCountryId: "kenya", primary: "physical-health", secondaries: ["discipline", "self-development"], strength: "Endurance", weakness: "Recovery", archetype: "aggressive", personality: { activityRate: 0.8, consistency: 0.62, explorationRate: 0.75, aggression: 0.82, challengePreference: 0.72, specialization: 0.7, recoveryRate: 0.45 } },
  { id: "youssef-hassan", name: "Youssef Hassan", title: "The Disciplined", icon: "🔥", originContinentId: "africa", originCountryId: "egypt", primary: "discipline", secondaries: ["physical-health", "self-development"], strength: "Discipline", weakness: "Ambition", archetype: "consistent", personality: { activityRate: 0.58, consistency: 0.82, explorationRate: 0.3, aggression: 0.25, challengePreference: 0.5, specialization: 0.7, recoveryRate: 0.75 } },

  // Asia -> mostly Discipline-flavored origins
  { id: "kenji-sato", name: "Kenji Sato", title: "The Master", icon: "🥋", originContinentId: "asia", originCountryId: "japan", primary: "discipline", secondaries: ["physical-health", "self-development"], strength: "Precision", weakness: "Rigidity", archetype: "aggressive", personality: { activityRate: 0.95, consistency: 0.9, explorationRate: 0.7, aggression: 0.85, challengePreference: 0.9, specialization: 0.93, recoveryRate: 0.6 } },
  { id: "ji-woo-han", name: "Ji-woo Han", title: "The Consistent", icon: "📅", originContinentId: "asia", originCountryId: "south_korea", primary: "discipline", secondaries: ["career", "self-development"], strength: "Consistency", weakness: "Aggression", archetype: "consistent", personality: { activityRate: 0.7, consistency: 0.88, explorationRate: 0.4, aggression: 0.3, challengePreference: 0.6, specialization: 0.75, recoveryRate: 0.8 } },
  { id: "priya-sharma", name: "Priya Sharma", title: "The Still Mind", icon: "🧘", originContinentId: "asia", originCountryId: "india", primary: "self-development", secondaries: ["discipline", "career"], strength: "Calm", weakness: "Speed", archetype: "unpredictable", personality: { activityRate: 0.48, consistency: 0.38, explorationRate: 0.45, aggression: 0.3, challengePreference: 0.45, specialization: 0.5, recoveryRate: 0.55 } },

  // South America -> Spirit/Identity-flavored origins
  { id: "rafael-souza", name: "Rafael Souza", title: "The Confident", icon: "⭐", originContinentId: "south-america", originCountryId: "brazil", primary: "career", secondaries: ["self-development", "physical-health"], strength: "Confidence", weakness: "Consistency", archetype: "consistent", personality: { activityRate: 0.72, consistency: 0.84, explorationRate: 0.42, aggression: 0.32, challengePreference: 0.58, specialization: 0.72, recoveryRate: 0.78 } },
  { id: "camila-fernandez", name: "Camila Fernandez", title: "The Seeker", icon: "🔍", originContinentId: "south-america", originCountryId: "argentina", primary: "self-development", secondaries: ["career", "discipline"], strength: "Identity", weakness: "Focus", archetype: "unpredictable", personality: { activityRate: 0.6, consistency: 0.4, explorationRate: 0.62, aggression: 0.4, challengePreference: 0.5, specialization: 0.48, recoveryRate: 0.5 } },
  { id: "mateo-rojas", name: "Mateo Rojas", title: "The Resilient", icon: "🌱", originContinentId: "south-america", originCountryId: "chile", primary: "discipline", secondaries: ["physical-health", "self-development"], strength: "Resilience", weakness: "Momentum", archetype: "aggressive", personality: { activityRate: 0.38, consistency: 0.45, explorationRate: 0.55, aggression: 0.6, challengePreference: 0.55, specialization: 0.5, recoveryRate: 0.6 } },

  // Oceania -> Adventure-flavored origins
  { id: "jack-turner", name: "Jack Turner", title: "The Explorer", icon: "🧭", originContinentId: "oceania", originCountryId: "australia", primary: "self-development", secondaries: ["physical-health", "career"], strength: "Exploration", weakness: "Structure", archetype: "unpredictable", personality: { activityRate: 0.52, consistency: 0.4, explorationRate: 0.85, aggression: 0.45, challengePreference: 0.5, specialization: 0.4, recoveryRate: 0.5 } },
  { id: "maya-thompson", name: "Maya Thompson", title: "The Adventurer", icon: "🏔️", originContinentId: "oceania", originCountryId: "new_zealand", primary: "physical-health", secondaries: ["self-development", "discipline"], strength: "Adventure", weakness: "Discipline", archetype: "aggressive", personality: { activityRate: 0.78, consistency: 0.6, explorationRate: 0.82, aggression: 0.8, challengePreference: 0.68, specialization: 0.62, recoveryRate: 0.5 } },
  { id: "isabella-reid", name: "Isabella Reid", title: "The Creator", icon: "🎨", originContinentId: "oceania", originCountryId: "fiji", primary: "career", secondaries: ["self-development", "discipline"], strength: "Creativity", weakness: "Consistency", archetype: "consistent", personality: { activityRate: 0.32, consistency: 0.5, explorationRate: 0.35, aggression: 0.22, challengePreference: 0.4, specialization: 0.6, recoveryRate: 0.7 } },
];

// A fixed literal, not `new Date()` - identity/quest-catalog data is static
// authored config, and a wall-clock timestamp here would make it vary
// between sessions for no reason (nothing derives real behavior from it).
const RIVAL_CREATED_AT = "2024-01-01T00:00:00.000Z";

export const RIVAL_IDENTITIES: ReadonlyArray<RivalIdentity> = RIVAL_SEEDS.map((seed) => ({
  id: seed.id,
  name: seed.name,
  title: seed.title,
  icon: seed.icon,
  originContinentId: seed.originContinentId,
  originCountryId: seed.originCountryId,
  primaryAttributeId: seed.primary,
  strength: seed.strength,
  weakness: seed.weakness,
  archetype: seed.archetype,
  personality: seed.personality,
  growthProfile: buildGrowthProfile(seed.primary, seed.secondaries),
  createdAt: RIVAL_CREATED_AT,
}));

const QUEST_CATALOG_BY_RIVAL_ID: Readonly<Record<string, ReadonlyArray<Quest>>> = Object.fromEntries(
  RIVAL_SEEDS.map((seed) => [seed.id, buildQuestCatalog(seed.id, seed.primary, seed.secondaries, RIVAL_CREATED_AT)]),
);

export function getRivalIdentity(rivalId: string): RivalIdentity | null {
  return RIVAL_IDENTITIES.find((identity) => identity.id === rivalId) ?? null;
}

export function getRivalIdentitiesForContinent(continentId: string): RivalIdentity[] {
  return RIVAL_IDENTITIES.filter((identity) => identity.originContinentId === continentId);
}

export function getRivalQuestCatalog(rivalId: string): ReadonlyArray<Quest> {
  return QUEST_CATALOG_BY_RIVAL_ID[rivalId] ?? [];
}
