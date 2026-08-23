import type { WorldRivalProfile } from "../types/world-map";

// 18 fictional rivals, 3 per continent, for motivation only - never real
// people, never randomly changing, never able to leap ahead of the user
// (see engines/world-map-engine.ts::getRivalLevel - a fixed, slow,
// calendar-deterministic formula, the same one used for the original 3).
export const RIVAL_PROFILES: ReadonlyArray<WorldRivalProfile> = [
  // Europe -> Mind
  { id: "sophie-laurent", name: "Sophie Laurent", title: "The Philosopher", icon: "🧠", originContinentId: "europe", originCountryId: "france", primaryDomain: "Reading", personality: "Methodical, reflective, rarely rushes a decision.", baseLevel: 34, daysPerLevel: 13, statProfile: { Logic: 74, Reading: 88, Writing: 81, Philosophy: 69 }, targetCountryId: "italy" },
  { id: "daniel-weber", name: "Daniel Weber", title: "The Analyst", icon: "📐", originContinentId: "europe", originCountryId: "germany", primaryDomain: "Logic", personality: "Precise, structured, distrusts anything unmeasured.", baseLevel: 41, daysPerLevel: 12, statProfile: { Logic: 90, Precision: 85, Communication: 52 }, targetCountryId: "united-kingdom" },
  { id: "eleni-papadaki", name: "Eleni Papadaki", title: "The Sage", icon: "📜", originContinentId: "europe", originCountryId: "greece", primaryDomain: "Philosophy", personality: "Patient, asks more questions than she answers.", baseLevel: 28, daysPerLevel: 14, statProfile: { Philosophy: 79, Reading: 70, Psychology: 61 }, targetCountryId: "greece" },

  // North America -> Trading
  { id: "alex-morgan", name: "Alex Morgan", title: "The Strategist", icon: "♟️", originContinentId: "north-america", originCountryId: "usa", primaryDomain: "Strategy", personality: "Plays the long game, rarely tilts.", baseLevel: 38, daysPerLevel: 12, statProfile: { Trading: 84, Logic: 77, Statistics: 72 }, targetCountryId: "usa" },
  { id: "ryan-coleman", name: "Ryan Coleman", title: "The Riskmaster", icon: "🛡️", originContinentId: "north-america", originCountryId: "canada", primaryDomain: "Risk Management", personality: "Survives first, profits second.", baseLevel: 22, daysPerLevel: 15, statProfile: { Trading: 61, Discipline: 70, Patience: 66 }, targetCountryId: "mexico" },
  { id: "elena-cruz", name: "Elena Cruz", title: "The Reader", icon: "👁️", originContinentId: "north-america", originCountryId: "mexico", primaryDomain: "Market Psychology", personality: "Reads the crowd before she reads the chart.", baseLevel: 30, daysPerLevel: 13, statProfile: { Trading: 68, Psychology: 75, Communication: 58 }, targetCountryId: "canada" },

  // Africa -> Body
  { id: "thabo-nkosi", name: "Thabo Nkosi", title: "The Warrior", icon: "🛡️", originContinentId: "africa", originCountryId: "south-africa", primaryDomain: "Strength", personality: "Trains through anything, skips nothing.", baseLevel: 45, daysPerLevel: 11, statProfile: { Physical: 91, Discipline: 80 }, targetCountryId: "kenya" },
  { id: "amara-wanjiru", name: "Amara Wanjiru", title: "The Runner", icon: "🏃", originContinentId: "africa", originCountryId: "kenya", primaryDomain: "Running", personality: "Distance is just a number she hasn't hit yet.", baseLevel: 33, daysPerLevel: 12, statProfile: { Physical: 82, Endurance: 88 }, targetCountryId: "egypt" },
  { id: "youssef-hassan", name: "Youssef Hassan", title: "The Disciplined", icon: "🔥", originContinentId: "africa", originCountryId: "egypt", primaryDomain: "Discipline", personality: "Shows up without exception, no matter the excuse.", baseLevel: 19, daysPerLevel: 16, statProfile: { Discipline: 65, Physical: 55 }, targetCountryId: "south-africa" },

  // Asia -> Discipline
  { id: "kenji-sato", name: "Kenji Sato", title: "The Master", icon: "🥋", originContinentId: "asia", originCountryId: "japan", primaryDomain: "Discipline", personality: "Precision through repetition, never satisfied.", baseLevel: 52, daysPerLevel: 10, statProfile: { Discipline: 92, Consistency: 87 }, targetCountryId: "china" },
  { id: "ji-woo-han", name: "Ji-woo Han", title: "The Consistent", icon: "📅", originContinentId: "asia", originCountryId: "south-korea", primaryDomain: "Consistency", personality: "Never misses twice.", baseLevel: 36, daysPerLevel: 12, statProfile: { Consistency: 83, Discipline: 74 }, targetCountryId: "japan" },
  { id: "priya-sharma", name: "Priya Sharma", title: "The Still Mind", icon: "🧘", originContinentId: "asia", originCountryId: "india", primaryDomain: "Meditation", personality: "Calm is a skill she practices daily.", baseLevel: 25, daysPerLevel: 14, statProfile: { Meditation: 78, SelfControl: 71 }, targetCountryId: "thailand" },

  // South America -> Spirit / Identity
  { id: "rafael-souza", name: "Rafael Souza", title: "The Confident", icon: "⭐", originContinentId: "south-america", originCountryId: "brazil", primaryDomain: "Confidence", personality: "Trusts his own capability, even under pressure.", baseLevel: 29, daysPerLevel: 13, statProfile: { Confidence: 80, Identity: 62 }, targetCountryId: "peru" },
  { id: "camila-fernandez", name: "Camila Fernandez", title: "The Seeker", icon: "🔍", originContinentId: "south-america", originCountryId: "argentina", primaryDomain: "Identity", personality: "Always asking who she actually is versus who she performs.", baseLevel: 40, daysPerLevel: 12, statProfile: { Identity: 85, Reflection: 68 }, targetCountryId: "chile" },
  { id: "mateo-rojas", name: "Mateo Rojas", title: "The Resilient", icon: "🌱", originContinentId: "south-america", originCountryId: "chile", primaryDomain: "Resilience", personality: "Bounces back on schedule, not on mood.", baseLevel: 17, daysPerLevel: 16, statProfile: { Resilience: 58, Identity: 45 }, targetCountryId: "argentina" },

  // Oceania -> Adventure
  { id: "jack-turner", name: "Jack Turner", title: "The Explorer", icon: "🧭", originContinentId: "oceania", originCountryId: "australia", primaryDomain: "Exploration", personality: "Goes somewhere new on purpose, every chance he gets.", baseLevel: 31, daysPerLevel: 13, statProfile: { Exploration: 76, Creativity: 55 }, targetCountryId: "new-zealand" },
  { id: "maya-thompson", name: "Maya Thompson", title: "The Adventurer", icon: "🏔️", originContinentId: "oceania", originCountryId: "new-zealand", primaryDomain: "Adventure", personality: "Seeks the harder, better path on principle.", baseLevel: 24, daysPerLevel: 14, statProfile: { Exploration: 70, Physical: 64 }, targetCountryId: "fiji" },
  { id: "isabella-reid", name: "Isabella Reid", title: "The Creator", icon: "🎨", originContinentId: "oceania", originCountryId: "fiji", primaryDomain: "Creativity", personality: "Makes something new rather than waits for inspiration.", baseLevel: 14, daysPerLevel: 18, statProfile: { Creativity: 62, Exploration: 40 }, targetCountryId: "australia" },
];

export function getRival(rivalId: string): WorldRivalProfile | null {
  return RIVAL_PROFILES.find((rival) => rival.id === rivalId) ?? null;
}

export function getRivalsForContinent(continentId: string): WorldRivalProfile[] {
  return RIVAL_PROFILES.filter((rival) => rival.originContinentId === continentId);
}

export function getRivalsTargetingCountry(countryId: string): WorldRivalProfile[] {
  return RIVAL_PROFILES.filter((rival) => rival.targetCountryId === countryId);
}
