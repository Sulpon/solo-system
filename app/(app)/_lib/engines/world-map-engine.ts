import { WORLD_CONTINENTS } from "../world-map/continents";
import { WORLD_COUNTRIES, getCountriesForContinent, getCountry } from "../world-map/countries";
import { getRivalIdentity } from "../world-map/rival-roster";
import { getNearestCountries } from "../world-map/geo-data";
import type { GoalNode, GoalNodeType, GoalTree } from "../types/goal-tree";
import type { CountryProgressState } from "../types/world-map";
import type { RivalState } from "../types/rival";

// No generic "flatten all nodes" helper exists in goal-tree-storage.ts
// (only collectProgressGoalNodes, which is type-specific) - mirrors the
// same small private flatten already used in activity-events.ts /
// chronicle-engine.ts for this exact need.
function flattenGoalTree(nodes: GoalTree): GoalNode[] {
  return nodes.flatMap((node) => [node, ...flattenGoalTree(node.children)]);
}

// -----------------------------------------------------------------------
// Country / continent progress - derived entirely from GoalNode.progress
// for Goals explicitly linked via worldMapLocationId. Zero new progress
// calculation: the Goal Tree already computed .progress; this only reads it.
// -----------------------------------------------------------------------

export function getLinkedGoals(countryId: string, goalTree: GoalTree): GoalNode[] {
  return flattenGoalTree(goalTree).filter((node) => node.worldMapLocationId === countryId);
}

const LINKABLE_GOAL_TYPES: ReadonlySet<GoalNodeType> = new Set(["dream", "long_term_goal", "progress_goal"]);

// Candidates for the Country view's "link an existing Goal here" control -
// meaningful top-level-ish goal types that aren't already placed somewhere
// on the map. Never creates a Goal, only reads/filters existing ones.
export function getLinkableGoalCandidates(goalTree: GoalTree): GoalNode[] {
  return flattenGoalTree(goalTree).filter((node) => LINKABLE_GOAL_TYPES.has(node.type) && !node.worldMapLocationId);
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

export function getContinentProgress(continentId: string, goalTree: GoalTree): number {
  const countries = getCountriesForContinent(continentId);

  if (countries.length === 0) {
    return 0;
  }

  const total = countries.reduce((sum, country) => sum + getCountryProgress(country.id, goalTree), 0);
  return Math.round(total / countries.length);
}

// -----------------------------------------------------------------------
// The single state ladder - drives both the label and the fog-of-war
// visual treatment (see plan: two overlapping state lists in the spec are
// consolidated into this one, centralized here).
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
// Character position - the selected/active Goal's linked country and
// furthest-completed real checkpoint. Movement only changes when a real
// milestone completes, per spec (not on every Quest completion).
// -----------------------------------------------------------------------

export type CharacterPosition = Readonly<{
  continentId: string;
  countryId: string;
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

  const country = getCountry(goal.worldMapLocationId);

  if (!country) {
    return null;
  }

  const checkpoints = getGoalRouteCheckpoints(goal);
  const lastCompletedIndex = checkpoints.reduce((latest, checkpoint, index) => (checkpoint.completed ? index : latest), -1);

  return {
    continentId: country.continentId,
    countryId: country.id,
    goalId: goal.id,
    goalTitle: goal.title,
    checkpointIndex: lastCompletedIndex,
    checkpointTitle: lastCompletedIndex >= 0 ? checkpoints[lastCompletedIndex].title : null,
    totalCheckpoints: checkpoints.length,
  };
}

// -----------------------------------------------------------------------
// World statistics - every number counted from real config + real
// goalTree, per spec ("do not invent values").
// -----------------------------------------------------------------------

export type WorldStatistics = Readonly<{
  countriesDiscovered: number;
  countriesTotal: number;
  countriesConquered: number;
  continentsExplored: number;
  continentsTotal: number;
  worldProgressPercent: number;
  activeGoalsCount: number;
  milestonesCompletedCount: number;
  // Always 0 today - no Boss can be defeated until the future Boss system
  // exists (every seeded CountryBoss is permanently "locked" for now). Kept
  // as a real, honestly-computed field rather than omitted, so the HUD
  // never needs to fabricate a number once defeats become possible.
  bossesDefeated: number;
}>;

export function getWorldStatistics(goalTree: GoalTree): WorldStatistics {
  const countryProgresses = WORLD_COUNTRIES.map((country) => getCountryProgress(country.id, goalTree));
  const worldProgressPercent = countryProgresses.length > 0 ? Math.round(countryProgresses.reduce((sum, value) => sum + value, 0) / countryProgresses.length) : 0;
  const linkedGoals = flattenGoalTree(goalTree).filter((node) => Boolean(node.worldMapLocationId));

  return {
    countriesDiscovered: countryProgresses.filter((progress) => progress > 0).length,
    countriesTotal: WORLD_COUNTRIES.length,
    countriesConquered: countryProgresses.filter((progress) => progress >= 100).length,
    continentsExplored: WORLD_CONTINENTS.filter((continent) => getContinentProgress(continent.id, goalTree) > 0).length,
    continentsTotal: WORLD_CONTINENTS.length,
    worldProgressPercent,
    activeGoalsCount: linkedGoals.filter((node) => node.status === "in_progress").length,
    milestonesCompletedCount: linkedGoals.reduce((sum, goal) => sum + getRealCompletedMilestoneCount(goal), 0),
    bossesDefeated: 0,
  };
}
