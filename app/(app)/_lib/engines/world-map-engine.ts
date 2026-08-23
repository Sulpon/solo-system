import { WORLD_CONTINENTS } from "../world-map/continents";
import { WORLD_COUNTRIES, getCountriesForContinent, getCountry } from "../world-map/countries";
import { getBossForCity } from "../world-map/dungeons";
import { getRivalIdentity } from "../world-map/rival-roster";
import { getNearestCountries } from "../world-map/geo-data";
import { resolveCountryId } from "../world-map/legacy-country-ids";
import type { GoalNode, GoalNodeType, GoalTree } from "../types/goal-tree";
import type { CityProgressState, CountryProgressState, WorldCountry, WorldDungeon } from "../types/world-map";
import type { RivalState } from "../types/rival";

// No generic "flatten all nodes" helper exists in goal-tree-storage.ts
// (only collectProgressGoalNodes, which is type-specific) - mirrors the
// same small private flatten already used in activity-events.ts /
// chronicle-engine.ts for this exact need.
function flattenGoalTree(nodes: GoalTree): GoalNode[] {
  return nodes.flatMap((node) => [node, ...flattenGoalTree(node.children)]);
}

// -----------------------------------------------------------------------
// Country / city progress - derived entirely from GoalNode.progress for
// Goals explicitly linked via worldMapLocationId (country) and, optionally,
// worldMapCityId (city). Zero new progress calculation: the Goal Tree
// already computed .progress; this only reads it. Legacy (pre-195-country)
// ids are resolved transparently on every read - see legacy-country-ids.ts.
// -----------------------------------------------------------------------

export function getLinkedGoals(countryId: string, goalTree: GoalTree): GoalNode[] {
  return flattenGoalTree(goalTree).filter((node) => node.worldMapLocationId && resolveCountryId(node.worldMapLocationId) === countryId);
}

export function getLinkedGoalsForCity(cityId: string, goalTree: GoalTree): GoalNode[] {
  return flattenGoalTree(goalTree).filter((node) => node.worldMapCityId === cityId);
}

const LINKABLE_GOAL_TYPES: ReadonlySet<GoalNodeType> = new Set(["dream", "long_term_goal", "progress_goal"]);

// Candidates for "link an existing Goal here" - meaningful top-level-ish
// goal types not already placed on the map. Never creates a Goal, only
// reads/filters existing ones.
export function getLinkableGoalCandidates(goalTree: GoalTree): GoalNode[] {
  return flattenGoalTree(goalTree).filter((node) => LINKABLE_GOAL_TYPES.has(node.type) && !node.worldMapLocationId);
}

// Candidates for "link this city to one of the country's already-linked
// Goals" - a Goal must already be assigned to the country before it can be
// refined to one of that country's cities (Goal -> Country -> optional City).
export function getLinkableGoalCandidatesForCity(countryId: string, goalTree: GoalTree): GoalNode[] {
  return getLinkedGoals(countryId, goalTree).filter((node) => !node.worldMapCityId);
}

export function getGoalById(goalTree: GoalTree, goalId: string): GoalNode | null {
  return flattenGoalTree(goalTree).find((node) => node.id === goalId) ?? null;
}

export function getCountryProgress(countryId: string, goalTree: GoalTree): number {
  const linked = getLinkedGoals(countryId, goalTree);

  if (linked.length === 0) {
    return 0;
  }

  const total = linked.reduce((sum, node) => sum + Math.max(0, Math.min(100, node.progress ?? 0)), 0);
  return Math.round(total / linked.length);
}

export function getCityProgress(cityId: string, goalTree: GoalTree): number {
  const linked = getLinkedGoalsForCity(cityId, goalTree);

  if (linked.length === 0) {
    return 0;
  }

  const total = linked.reduce((sum, node) => sum + Math.max(0, Math.min(100, node.progress ?? 0)), 0);
  return Math.round(total / linked.length);
}

export function getContinentProgress(continentId: string, goalTree: GoalTree): number {
  const countries = getCountriesForContinent(continentId);

  if (countries.length === 0) {
    return 0;
  }

  const total = countries.reduce((sum, country) => sum + getCountryProgress(country.id, goalTree), 0);
  return Math.round(total / countries.length);
}

// Batch variant for rendering all 195 countries at once (World view) -
// flattens the Goal Tree once instead of once per country. Use this instead
// of calling getCountryProgress in a loop over WORLD_COUNTRIES.
export function getAllCountryProgress(goalTree: GoalTree): ReadonlyMap<string, number> {
  const flat = flattenGoalTree(goalTree);
  const sums = new Map<string, { total: number; count: number }>();

  flat.forEach((node) => {
    if (!node.worldMapLocationId) return;
    const countryId = resolveCountryId(node.worldMapLocationId);
    const entry = sums.get(countryId) ?? { total: 0, count: 0 };
    entry.total += Math.max(0, Math.min(100, node.progress ?? 0));
    entry.count += 1;
    sums.set(countryId, entry);
  });

  const result = new Map<string, number>();
  WORLD_COUNTRIES.forEach((country) => {
    const entry = sums.get(country.id);
    result.set(country.id, entry ? Math.round(entry.total / entry.count) : 0);
  });
  return result;
}

// -----------------------------------------------------------------------
// The single state ladder - drives both the label and the fog-of-war
// visual treatment. Shared by countries and cities; a city additionally
// gates "conquered" behind a real Boss victory (see getCityState below),
// never purely on percentage.
// -----------------------------------------------------------------------

const STATE_THRESHOLDS: ReadonlyArray<Readonly<{ min: number; state: CountryProgressState; label: string }>> = [
  { min: 100, state: "conquered", label: "Conquered" },
  { min: 75, state: "dominated", label: "Dominated" },
  { min: 50, state: "occupied", label: "Occupied" },
  { min: 25, state: "explored", label: "Explored" },
  { min: 0, state: "unknown", label: "Unknown" },
];

export function getCountryState(progressPercent: number): CountryProgressState {
  return (STATE_THRESHOLDS.find((entry) => progressPercent >= entry.min) ?? STATE_THRESHOLDS[STATE_THRESHOLDS.length - 1]).state;
}

export function getCountryStateLabel(state: CountryProgressState): string {
  if (state === "contested") {
    return "Contested";
  }

  return STATE_THRESHOLDS.find((entry) => entry.state === state)?.label ?? "Unknown";
}

// -----------------------------------------------------------------------
// Dungeon / Boss / City conquest - per-city, independent of every other
// city in the country (World Map Rules: "Cross-city independence"). The
// only persisted fact is completion; locked/available are always derived
// live from city progress + data-driven requirements.
// -----------------------------------------------------------------------

// dungeonId -> ISO completedAt. Presence = completed; nothing else is
// stored (locked/available never need persistence - see decision 3's
// storage note in the plan).
export type WorldMapDungeonProgress = Readonly<Record<string, string>>;

export type DungeonRequirementCheck = Readonly<{ label: string; met: boolean }>;

// Purely data-driven: reads dungeon.requirementGoalIds/requirementSkillIds,
// never hardcodes a requirement in a component. Every seeded Dungeon today
// has empty requirement arrays (none authored in the source data yet), so
// this returns [] and every dungeon is gated by city-progress alone - never
// silently invents a requirement, and never silently assumes a Skill
// requirement is met (no Skill system exists yet to verify against).
export function getDungeonRequirements(dungeon: WorldDungeon, goalTree: GoalTree): DungeonRequirementCheck[] {
  const goalChecks = dungeon.requirementGoalIds.map((goalId) => {
    const goal = getGoalById(goalTree, goalId);
    return {
      label: goal ? `Goal: ${goal.title}` : `Goal (${goalId})`,
      met: Boolean(goal && ((goal.progress ?? 0) >= 100 || goal.status === "completed")),
    };
  });

  const skillChecks = dungeon.requirementSkillIds.map((skillId) => ({ label: `Skill (${skillId})`, met: false }));

  return [...goalChecks, ...skillChecks];
}

export function areDungeonRequirementsMet(dungeon: WorldDungeon, goalTree: GoalTree): boolean {
  return getDungeonRequirements(dungeon, goalTree).every((check) => check.met);
}

export function getDungeonStatus(dungeon: WorldDungeon, cityProgress: number, dungeonProgress: WorldMapDungeonProgress, goalTree: GoalTree): "locked" | "available" | "completed" {
  if (dungeonProgress[dungeon.id]) {
    return "completed";
  }

  if (cityProgress >= dungeon.unlockProgressPct && areDungeonRequirementsMet(dungeon, goalTree)) {
    return "available";
  }

  return "locked";
}

// A city is conquered exactly when its Boss (dungeonNumber 5) has a real
// completion recorded - never inferred from 100% progress alone (Dungeon
// completion, and even reaching 100%, does NOT auto-conquer the city; the
// player must explicitly win the Boss fight).
export function isCityConquered(cityId: string, dungeonProgress: WorldMapDungeonProgress): boolean {
  const boss = getBossForCity(cityId);
  return Boolean(boss && dungeonProgress[boss.id]);
}

export function getCityState(cityId: string, progressPercent: number, dungeonProgress: WorldMapDungeonProgress): CityProgressState {
  if (isCityConquered(cityId, dungeonProgress)) {
    return "conquered";
  }

  // Clamped below 100 so raw progress alone can never visually read as
  // conquered before the real Boss-victory action happens.
  const clamped = Math.min(99, progressPercent);
  const entry = STATE_THRESHOLDS.find((item) => clamped >= item.min) ?? STATE_THRESHOLDS[STATE_THRESHOLDS.length - 1];
  return entry.state as CityProgressState;
}

export type CountryConquestStatus = Readonly<{
  conqueredCityIds: ReadonlyArray<string>;
  totalCityIds: number;
  isConquered: boolean;
}>;

// Country conquest = every city in the country's own configured cityIds
// list is conquered - not "all cities that could theoretically exist," and
// not gated on completing every Dungeon (per World Map Rules).
export function getCountryConquestStatus(country: WorldCountry, dungeonProgress: WorldMapDungeonProgress): CountryConquestStatus {
  const conqueredCityIds = country.cityIds.filter((cityId) => isCityConquered(cityId, dungeonProgress));
  return {
    conqueredCityIds,
    totalCityIds: country.cityIds.length,
    isConquered: country.cityIds.length > 0 && conqueredCityIds.length === country.cityIds.length,
  };
}

// -----------------------------------------------------------------------
// Territory ownership - multi-party now that Rivals have real, simulated
// progress of their own (see world-map/rival-simulation-engine.ts). The
// player's side is still 100% real Goal Tree data; each Rival's side is
// their own persisted RivalState.countryProgress - nothing here is
// fabricated or teleported in reaction to the player.
// -----------------------------------------------------------------------

const CONTESTED_PROGRESS_THRESHOLD = 20;

export type CountryOwnershipEntry = Readonly<{ rivalId: string; name: string; progress: number; conquered: boolean }>;

export type CountryOwnership = Readonly<{
  playerProgress: number;
  playerConquered: boolean;
  rivals: ReadonlyArray<CountryOwnershipEntry>;
  isContested: boolean;
  dominantOwner: "player" | "rival" | "unknown";
  dominantRivalId: string | null;
}>;

export function getCountryOwnership(countryId: string, goalTree: GoalTree, rivalStates: Readonly<Record<string, RivalState>>): CountryOwnership {
  const playerProgress = getCountryProgress(countryId, goalTree);
  const playerConquered = playerProgress >= 100;

  const rivals: CountryOwnershipEntry[] = Object.values(rivalStates)
    .map((state) => ({
      rivalId: state.identityId,
      name: getRivalIdentity(state.identityId)?.name ?? state.identityId,
      progress: state.countryProgress[countryId] ?? 0,
      conquered: state.conqueredCountryIds.includes(countryId),
    }))
    .filter((entry) => entry.progress > 0)
    .sort((a, b) => b.progress - a.progress);

  const partiesAboveThreshold = (playerProgress >= CONTESTED_PROGRESS_THRESHOLD ? 1 : 0) + rivals.filter((entry) => entry.progress >= CONTESTED_PROGRESS_THRESHOLD).length;
  const isContested = partiesAboveThreshold >= 2;

  const topRival = rivals[0] ?? null;
  let dominantOwner: "player" | "rival" | "unknown" = "unknown";
  let dominantRivalId: string | null = null;

  if (playerConquered && !topRival?.conquered) {
    dominantOwner = "player";
  } else if (topRival?.conquered) {
    dominantOwner = "rival";
    dominantRivalId = topRival.rivalId;
  } else if (playerProgress > 0 && playerProgress >= (topRival?.progress ?? 0)) {
    dominantOwner = "player";
  } else if (topRival) {
    dominantOwner = "rival";
    dominantRivalId = topRival.rivalId;
  }

  return { playerProgress, playerConquered, rivals, isContested, dominantOwner, dominantRivalId };
}

export function isCountryContested(countryId: string, goalTree: GoalTree, rivalStates: Readonly<Record<string, RivalState>>): boolean {
  return getCountryOwnership(countryId, goalTree, rivalStates).isContested;
}

// The state actually shown on the map/detail panel - percentage-driven
// state of whichever party dominates, with contested as an overlay when
// applicable.
export function getCountryDisplayState(countryId: string, goalTree: GoalTree, rivalStates: Readonly<Record<string, RivalState>>): CountryProgressState {
  const ownership = getCountryOwnership(countryId, goalTree, rivalStates);

  if (ownership.isContested) {
    return "contested";
  }

  if (ownership.dominantOwner === "rival") {
    const rival = ownership.rivals.find((entry) => entry.rivalId === ownership.dominantRivalId);
    return getCountryState(rival?.progress ?? 0);
  }

  return getCountryState(ownership.playerProgress);
}

// Ring distance to a Rival using real geography (see geo-data.ts) - 0 means
// same country (an encounter), 1 the nearest neighbor, and so on. Not a
// precise border-adjacency graph, an approximation by sorted distance.
export function getRivalDistance(playerCountryId: string | null, rivalCountryId: string): number | null {
  if (!playerCountryId) {
    return null;
  }

  if (playerCountryId === rivalCountryId) {
    return 0;
  }

  const nearest = getNearestCountries(playerCountryId, WORLD_COUNTRIES.length);
  const index = nearest.findIndex((entry) => entry.id === rivalCountryId);
  return index === -1 ? null : index + 1;
}

// -----------------------------------------------------------------------
// Route checkpoints - reads an existing sequential_milestone child's steps,
// or plain milestone children, as-is. Never invents a completion.
// -----------------------------------------------------------------------

export type RouteCheckpoint = Readonly<{ id: string; title: string; completed: boolean }>;

function findRealMilestoneCheckpoints(goal: GoalNode): RouteCheckpoint[] | null {
  const sequentialChild = goal.children.find((child) => child.type === "sequential_milestone" && (child.steps?.length ?? 0) > 0);

  if (sequentialChild?.steps) {
    return sequentialChild.steps.map((step) => ({ id: step.id, title: step.title, completed: step.completed }));
  }

  const milestoneChildren = goal.children.filter((child) => child.type === "milestone");

  if (milestoneChildren.length > 0) {
    return milestoneChildren.map((child) => ({ id: child.id, title: child.title, completed: Boolean(child.completed) || child.status === "completed" }));
  }

  return null;
}

// For rendering a route even when a Goal has no real milestone children yet
// - a synthetic 2-point Start->Destination line, clearly not a real
// milestone (see getRealMilestoneCompletionCount below, which excludes it).
export function getGoalRouteCheckpoints(goal: GoalNode): RouteCheckpoint[] {
  return (
    findRealMilestoneCheckpoints(goal) ?? [
      { id: `${goal.id}-start`, title: "Start", completed: true },
      { id: `${goal.id}-destination`, title: goal.title, completed: (goal.progress ?? 0) >= 100 || goal.status === "completed" },
    ]
  );
}

function getRealCompletedMilestoneCount(goal: GoalNode): number {
  const real = findRealMilestoneCheckpoints(goal);
  return real ? real.filter((checkpoint) => checkpoint.completed).length : 0;
}

// -----------------------------------------------------------------------
// Character position - the selected/active Goal's linked country (and,
// optionally, city) and furthest-completed real checkpoint. Movement only
// changes when a real milestone completes, per spec (not on every Quest
// completion).
// -----------------------------------------------------------------------

export type CharacterPosition = Readonly<{
  continentId: string;
  countryId: string;
  cityId?: string;
  goalId: string;
  goalTitle: string;
  checkpointIndex: number;
  checkpointTitle: string | null;
  totalCheckpoints: number;
}>;

export function getCharacterPosition(goalTree: GoalTree, selectedGoalId: string | null): CharacterPosition | null {
  if (!selectedGoalId) {
    return null;
  }

  const goal = flattenGoalTree(goalTree).find((node) => node.id === selectedGoalId);

  if (!goal || !goal.worldMapLocationId) {
    return null;
  }

  const country = getCountry(resolveCountryId(goal.worldMapLocationId));

  if (!country) {
    return null;
  }

  const cityId = goal.worldMapCityId && country.cityIds.includes(goal.worldMapCityId) ? goal.worldMapCityId : undefined;
  const checkpoints = getGoalRouteCheckpoints(goal);
  const lastCompletedIndex = checkpoints.reduce((latest, checkpoint, index) => (checkpoint.completed ? index : latest), -1);

  return {
    continentId: country.continentId,
    countryId: country.id,
    cityId,
    goalId: goal.id,
    goalTitle: goal.title,
    checkpointIndex: lastCompletedIndex,
    checkpointTitle: lastCompletedIndex >= 0 ? checkpoints[lastCompletedIndex].title : null,
    totalCheckpoints: checkpoints.length,
  };
}

// -----------------------------------------------------------------------
// World statistics - every number counted from real config + real
// goalTree + real persisted Dungeon/Boss completion, per spec ("do not
// invent values").
// -----------------------------------------------------------------------

export type WorldStatistics = Readonly<{
  countriesDiscovered: number;
  countriesTotal: number;
  countriesConquered: number;
  citiesConquered: number;
  citiesTotal: number;
  continentsExplored: number;
  continentsTotal: number;
  worldProgressPercent: number;
  activeGoalsCount: number;
  milestonesCompletedCount: number;
  bossesDefeated: number;
}>;

export function getWorldStatistics(goalTree: GoalTree, dungeonProgress: WorldMapDungeonProgress): WorldStatistics {
  const countryProgressById = getAllCountryProgress(goalTree);
  const countryProgresses = Array.from(countryProgressById.values());
  const worldProgressPercent = countryProgresses.length > 0 ? Math.round(countryProgresses.reduce((sum, value) => sum + value, 0) / countryProgresses.length) : 0;
  const linkedGoals = flattenGoalTree(goalTree).filter((node) => Boolean(node.worldMapLocationId));

  const countryConquests = WORLD_COUNTRIES.map((country) => getCountryConquestStatus(country, dungeonProgress));
  const citiesConquered = countryConquests.reduce((sum, entry) => sum + entry.conqueredCityIds.length, 0);
  const citiesTotal = WORLD_COUNTRIES.reduce((sum, country) => sum + country.cityIds.length, 0);

  return {
    countriesDiscovered: countryProgresses.filter((progress) => progress > 0).length,
    countriesTotal: WORLD_COUNTRIES.length,
    countriesConquered: countryConquests.filter((entry) => entry.isConquered).length,
    citiesConquered,
    citiesTotal,
    continentsExplored: WORLD_CONTINENTS.filter((continent) => getContinentProgress(continent.id, goalTree) > 0).length,
    continentsTotal: WORLD_CONTINENTS.length,
    worldProgressPercent,
    activeGoalsCount: linkedGoals.filter((node) => node.status === "in_progress").length,
    milestonesCompletedCount: linkedGoals.reduce((sum, goal) => sum + getRealCompletedMilestoneCount(goal), 0),
    bossesDefeated: citiesConquered,
  };
}
