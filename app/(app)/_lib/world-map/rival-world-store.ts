import { getLocalDayKey, parseLocalDayKey } from "../local-day";
import { calculateLevel, getRankLabel } from "../engines/level-engine";
import { initializeRivalState, simulateRivalDay } from "./rival-simulation-engine";
import { RIVAL_IDENTITIES } from "./rival-roster";
import type { RivalEncounter, RivalState } from "../types/rival";

// Bounds how far a single catch-up pass will replay - a long absence (or a
// missing/corrupted clock) fast-forwards to the last 60 simulated days
// instead of replaying an unbounded backlog. Documented trade-off, not a
// silent bug (see plan decision #9).
const MAX_CATCH_UP_DAYS = 60;
const MAX_ENCOUNTERS = 200;

function enumerateDayKeys(fromDayKey: string, toDayKey: string, capDays: number): string[] {
  const keys: string[] = [];
  let cursor = fromDayKey;
  let guard = 0;

  while (cursor <= toDayKey && guard < capDays) {
    keys.push(cursor);
    cursor = nextDayKeyOf(cursor);
    guard += 1;
  }

  return keys;
}

function nextDayKeyOf(dayKey: string): string {
  const date = parseLocalDayKey(dayKey);
  date.setDate(date.getDate() + 1);
  return getLocalDayKey(date);
}

export type CatchUpResult = Readonly<{
  states: Readonly<Record<string, RivalState>>;
  newEncounters: ReadonlyArray<RivalEncounter>;
  nextLastSimulatedAt: string;
  didAdvance: boolean;
}>;

// Pure - takes the current persisted state and returns the next state, never
// touching localStorage itself (the hook below owns persistence). Safe to
// call repeatedly with the same inputs (idempotent when already caught up
// for today - see the same-day early exit).
export function runCatchUpSimulation(
  existingStates: Readonly<Record<string, RivalState>>,
  lastSimulatedAt: string | null,
  playerActiveCountryId: string | null,
  playerLevel: number,
  now: Date = new Date(),
): CatchUpResult {
  const nowIso = now.toISOString();
  const nowDayKey = getLocalDayKey(now);

  const states: Record<string, RivalState> = { ...existingStates };
  RIVAL_IDENTITIES.forEach((identity) => {
    if (!states[identity.id]) {
      states[identity.id] = initializeRivalState(identity, nowIso);
    }
  });

  const lastDayKey = lastSimulatedAt ? getLocalDayKey(lastSimulatedAt) : null;

  if (lastDayKey !== nowDayKey) {
    const fromDayKey = lastDayKey ? nextDayKeyOf(lastDayKey) : nowDayKey;
    const dayKeys = enumerateDayKeys(fromDayKey, nowDayKey, MAX_CATCH_UP_DAYS);

    dayKeys.forEach((dayKey) => {
      RIVAL_IDENTITIES.forEach((identity) => {
        states[identity.id] = simulateRivalDay(identity, states[identity.id], dayKey, playerActiveCountryId);
      });
    });

    // Already simulated today - reloading within the same day must not
    // re-run the day (would double-count XP/progress). Encounter detection
    // below still runs regardless - it's cheap and must reflect the current
    // player location even when no new day was simulated (e.g. the player
    // links a Goal to a Rival-occupied country mid-session).
    return { states, newEncounters: detectEncounters(states, playerActiveCountryId, playerLevel, now), nextLastSimulatedAt: nowIso, didAdvance: dayKeys.length > 0 };
  }

  return { states, newEncounters: detectEncounters(states, playerActiveCountryId, playerLevel, now), nextLastSimulatedAt: lastSimulatedAt ?? nowIso, didAdvance: false };
}

// Cheap (O(rival count)) and independent of whether any days were just
// simulated - always reflects the current persisted state against the
// player's current location. Safe to call on every relevant render.
export function detectEncounters(states: Readonly<Record<string, RivalState>>, playerActiveCountryId: string | null, playerLevel: number, now: Date = new Date()): RivalEncounter[] {
  if (!playerActiveCountryId) {
    return [];
  }

  const nowIso = now.toISOString();
  const nowDayKey = getLocalDayKey(now);
  const newEncounters: RivalEncounter[] = [];

  RIVAL_IDENTITIES.forEach((identity) => {
    const state = states[identity.id];
    if (state && state.currentCountryId === playerActiveCountryId) {
      const rivalLevel = calculateLevel(state.totalXp).currentLevel;
      newEncounters.push({
        id: `${identity.id}-${playerActiveCountryId}-${nowDayKey}`,
        rivalId: identity.id,
        countryId: playerActiveCountryId,
        date: nowIso,
        playerSnapshot: { level: playerLevel, rank: getRankLabel(playerLevel) },
        rivalSnapshot: { level: rivalLevel, rank: getRankLabel(rivalLevel) },
        status: "pending",
      });
    }
  });

  return newEncounters;
}

export function mergeEncounters(existing: ReadonlyArray<RivalEncounter>, incoming: ReadonlyArray<RivalEncounter>): RivalEncounter[] {
  const byId = new Map(existing.map((encounter) => [encounter.id, encounter]));
  incoming.forEach((encounter) => {
    if (!byId.has(encounter.id)) {
      byId.set(encounter.id, encounter);
    }
  });
  return Array.from(byId.values()).slice(-MAX_ENCOUNTERS);
}
