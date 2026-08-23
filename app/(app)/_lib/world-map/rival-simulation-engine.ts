import { createQuestCompletion } from "../quest-storage";
import { calculateLevel } from "../engines/level-engine";
import { getLocalDayKey, parseLocalDayKey } from "../local-day";
import { getCountry } from "./countries";
import { getDungeonsForCountry } from "./dungeons";
import { getNearestCountries } from "./geo-data";
import { getRivalQuestCatalog } from "./rival-roster";
import type { Quest } from "../types/quest";
import type { RivalArchetype, RivalHistoryEvent, RivalHistoryEventType, RivalIdentity, RivalState } from "../types/rival";

const RECENT_COMPLETIONS_CAP = 120;
const HISTORY_CAP = 40;
const CONQUEST_PROGRESS_THRESHOLD = 100;
const DUNGEON_ATTEMPT_PROGRESS_THRESHOLD = 40;
const EARLY_BIAS_WINDOW_DAYS = 21;

// ---------------------------------------------------------------------------
// Deterministic PRNG - every simulated day's randomness is seeded from
// hash(rivalId + dayKey), so the exact same inputs always produce the exact
// same outcome (section 30/33: reproducible, never a live Math.random()).
// ---------------------------------------------------------------------------

function hashStringToSeed(input: string): number {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createSeededRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function previousDayKey(dayKey: string): string {
  const date = parseLocalDayKey(dayKey);
  date.setDate(date.getDate() - 1);
  return getLocalDayKey(date);
}

// ---------------------------------------------------------------------------
// Fresh state factory - a rival's clock starts at whenever the World Map is
// first activated, not a fixed historical epoch (see plan decision #9 - this
// is what keeps the "first encounter within 2-4 weeks" window meaningful).
// ---------------------------------------------------------------------------

export function initializeRivalState(identity: RivalIdentity, createdAt: string): RivalState {
  return {
    identityId: identity.id,
    totalXp: 0,
    masteryXpByQuestId: {},
    streakByQuestId: {},
    lastCompletedDayKeyByQuestId: {},
    challengeStateByQuestId: {},
    attributeXp: {},
    recentCompletions: [],
    currentContinentId: identity.originContinentId,
    currentCountryId: identity.originCountryId,
    countryProgress: { [identity.originCountryId]: 0 },
    conqueredCountryIds: [],
    dungeonAttempts: {},
    bossAttempts: {},
    history: [{ id: `${identity.id}-start`, date: createdAt, type: "level_up", label: `Started the journey in ${getCountry(identity.originCountryId)?.name ?? identity.originCountryId}` }],
    daysSinceStart: 0,
    createdAt,
  };
}

const ARCHETYPE_BUDGET_RANGE: Readonly<Record<RivalArchetype, readonly [number, number]>> = {
  aggressive: [4, 8],
  consistent: [2, 6],
  unpredictable: [0, 8],
};

const ARCHETYPE_SKIP_MULTIPLIER: Readonly<Record<RivalArchetype, number>> = {
  aggressive: 0.8,
  consistent: 0.5,
  unpredictable: 1.3,
};

function pushHistory(history: ReadonlyArray<RivalHistoryEvent>, event: Omit<RivalHistoryEvent, "id">, dayKey: string): ReadonlyArray<RivalHistoryEvent> {
  const entry: RivalHistoryEvent = { id: `${dayKey}-${event.type}-${history.length}`, ...event };
  return [...history, entry].slice(-HISTORY_CAP);
}

function pickWeightedQuest(catalog: ReadonlyArray<Quest>, identity: RivalIdentity, alreadyDoneToday: ReadonlySet<string>, rng: () => number): Quest | null {
  const available = catalog.filter((quest) => !alreadyDoneToday.has(quest.id));

  if (available.length === 0) {
    return null;
  }

  // ~30% pure-random pick, ~70% weighted toward the rival's own specialization
  // (primary-attribute quests weighted up by `specialization`) - section 9.
  if (rng() < 0.3) {
    return available[Math.floor(rng() * available.length)];
  }

  const weights = available.map((quest) => (quest.categoryId === identity.primaryAttributeId ? 1 + identity.personality.specialization * 2 : 1));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = rng() * total;

  for (let index = 0; index < available.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) {
      return available[index];
    }
  }

  return available[available.length - 1];
}

export function simulateRivalDay(identity: RivalIdentity, state: RivalState, dayKey: string, playerActiveCountryId: string | null): RivalState {
  const rng = createSeededRandom(hashStringToSeed(`${identity.id}:${dayKey}`));
  const catalog = getRivalQuestCatalog(identity.id);

  let next: RivalState = { ...state, daysSinceStart: state.daysSinceStart + 1 };

  // -------------------------------------------------------------------
  // 1. Skip-day roll, driven by consistency (section 11).
  // -------------------------------------------------------------------
  const skipChance = Math.min(0.85, Math.max(0, 1 - identity.personality.consistency) * ARCHETYPE_SKIP_MULTIPLIER[identity.archetype]);
  const isSkipDay = rng() < skipChance;

  if (!isSkipDay) {
    const [lo, hi] = ARCHETYPE_BUDGET_RANGE[identity.archetype];
    const base = lo + (hi - lo) * identity.personality.activityRate;
    const jitter = (rng() - 0.5) * (hi - lo) * 0.6;
    const budget = Math.max(0, Math.min(hi, Math.round(base + jitter)));

    const doneToday = new Set<string>();

    for (let action = 0; action < budget; action += 1) {
      const quest = pickWeightedQuest(catalog, identity, doneToday, rng);
      if (!quest) {
        break;
      }
      doneToday.add(quest.id);

      const previousStreak = next.streakByQuestId[quest.id] ?? 0;
      const wasYesterday = next.lastCompletedDayKeyByQuestId[quest.id] === previousDayKey(dayKey);
      const streakDays = wasYesterday ? previousStreak + 1 : 1;

      let challengeBonusXp = 0;
      let challengeState = next.challengeStateByQuestId[quest.id] ?? { levelIndex: 0, currentStreak: 0 };
      let metricValue: number | undefined;

      if (quest.challenge?.enabled && quest.challenge.levels.length > 0) {
        const level = quest.challenge.levels[Math.min(challengeState.levelIndex, quest.challenge.levels.length - 1)];
        const successProb = 0.3 + identity.personality.challengePreference * 0.5;
        const passed = rng() < successProb;
        metricValue = passed ? level.target : Math.max(0, Math.floor(level.target * rng()));

        if (passed) {
          const advancedStreak = challengeState.currentStreak + 1;
          if (advancedStreak >= quest.challenge.requiredStreak && challengeState.levelIndex < quest.challenge.levels.length - 1) {
            challengeBonusXp = level.xp ?? 0;
            challengeState = { levelIndex: challengeState.levelIndex + 1, currentStreak: 0 };
            next = { ...next, history: pushHistory(next.history, { date: dayKey, type: "challenge_level_up", label: `${quest.title} reached Challenge level ${challengeState.levelIndex + 1}` }, dayKey) };
          } else {
            challengeState = { ...challengeState, currentStreak: advancedStreak };
          }
        } else {
          challengeState = { ...challengeState, currentStreak: 0 };
        }
      }

      const growthCoefficient = identity.growthProfile[quest.categoryId] ?? 1;
      const attributeXpAwarded = Math.round(quest.xp * growthCoefficient);

      const completion = createQuestCompletion(quest, `${dayKey}T12:00:00.000Z`, [{ attributeId: quest.categoryId, xp: attributeXpAwarded }], streakDays, metricValue, null, challengeBonusXp);

      const previousLevel = calculateLevel(next.totalXp).currentLevel;
      const nextTotalXp = next.totalXp + completion.xpAwarded;
      const nextLevel = calculateLevel(nextTotalXp).currentLevel;

      next = {
        ...next,
        totalXp: nextTotalXp,
        masteryXpByQuestId: { ...next.masteryXpByQuestId, [quest.id]: (next.masteryXpByQuestId[quest.id] ?? 0) + quest.xp },
        streakByQuestId: { ...next.streakByQuestId, [quest.id]: streakDays },
        lastCompletedDayKeyByQuestId: { ...next.lastCompletedDayKeyByQuestId, [quest.id]: dayKey },
        challengeStateByQuestId: { ...next.challengeStateByQuestId, [quest.id]: challengeState },
        attributeXp: { ...next.attributeXp, [quest.categoryId]: (next.attributeXp[quest.categoryId] ?? 0) + attributeXpAwarded },
        recentCompletions: [...next.recentCompletions, completion].slice(-RECENT_COMPLETIONS_CAP),
      };

      if (nextLevel > previousLevel) {
        next = { ...next, history: pushHistory(next.history, { date: dayKey, type: "level_up", label: `Reached Level ${nextLevel}` }, dayKey) };
      }

      // 2. Territory progress - each completion nudges the rival's own
      // progress in whichever country they're currently in; on-domain
      // quests contribute more (section 19: progression must emerge from
      // simulated activity, never instant conquest).
      const isOnDomain = quest.categoryId === identity.primaryAttributeId;
      const increment = (isOnDomain ? 4 + rng() * 3 : 1 + rng() * 1.5) * (0.6 + identity.personality.aggression * 0.4);
      const countryId = next.currentCountryId;
      const currentProgress = next.countryProgress[countryId] ?? 0;
      next = { ...next, countryProgress: { ...next.countryProgress, [countryId]: Math.min(100, currentProgress + increment) } };
    }
  }

  // -------------------------------------------------------------------
  // 3. Dungeon / Boss attempts (sections 20-21) - probabilistic, never
  // automatic. Only rolled once enough territory progress exists.
  // -------------------------------------------------------------------
  const currentCountryId = next.currentCountryId;
  const currentProgress = next.countryProgress[currentCountryId] ?? 0;

  if (currentProgress >= DUNGEON_ATTEMPT_PROGRESS_THRESHOLD && rng() < 0.15 + identity.personality.aggression * 0.1) {
    const dungeons = getDungeonsForCountry(currentCountryId);
    const uncleared = dungeons.find((dungeon) => !(next.dungeonAttempts[dungeon.id]?.cleared ?? false));

    if (uncleared) {
      const attemptsSoFar = next.dungeonAttempts[uncleared.id]?.attempts ?? 0;
      const successProb = Math.min(0.85, 0.3 + currentProgress / 200 + attemptsSoFar * 0.05);
      const success = rng() < successProb;
      next = { ...next, dungeonAttempts: { ...next.dungeonAttempts, [uncleared.id]: { attempts: attemptsSoFar + 1, cleared: success } } };

      if (success) {
        next = { ...next, history: pushHistory(next.history, { date: dayKey, type: "dungeon_cleared", label: `Cleared ${uncleared.name}` }, dayKey) };
      }
    }
  }

  if (currentProgress >= CONQUEST_PROGRESS_THRESHOLD && !next.conqueredCountryIds.includes(currentCountryId)) {
    const bossAttempt = next.bossAttempts[currentCountryId] ?? { attempts: 0, defeated: false };

    if (!bossAttempt.defeated && rng() < 0.2 + identity.personality.aggression * 0.15) {
      const successProb = Math.min(0.75, 0.25 + bossAttempt.attempts * 0.08);
      const defeated = rng() < successProb;
      next = { ...next, bossAttempts: { ...next.bossAttempts, [currentCountryId]: { attempts: bossAttempt.attempts + 1, defeated } } };

      if (defeated) {
        const countryName = getCountry(currentCountryId)?.name ?? currentCountryId;
        next = {
          ...next,
          conqueredCountryIds: [...next.conqueredCountryIds, currentCountryId],
          history: pushHistory(next.history, { date: dayKey, type: "country_conquered", label: `Conquered ${countryName}` }, dayKey),
        };
      }
    }
  }

  // -------------------------------------------------------------------
  // 4. Movement - toward the nearest 1-3 real-geography neighbors, biased
  // during the first ~3 weeks toward the player's active region (section
  // 24/25) but never teleporting (section 18).
  // -------------------------------------------------------------------
  const moveChance = 0.08 + identity.personality.explorationRate * 0.15;

  if (rng() < moveChance) {
    const neighbors = getNearestCountries(currentCountryId, 5);
    if (neighbors.length > 0) {
      let pool = neighbors.slice(0, 3);

      if (next.daysSinceStart <= EARLY_BIAS_WINDOW_DAYS && playerActiveCountryId && playerActiveCountryId !== currentCountryId) {
        const towardPlayer = getNearestCountries(playerActiveCountryId, 26).findIndex((entry) => pool.some((candidate) => candidate.id === entry.id));
        if (towardPlayer !== -1) {
          const preferred = getNearestCountries(playerActiveCountryId, 26)[towardPlayer];
          pool = [preferred, ...pool.filter((entry) => entry.id !== preferred.id)];
        }
      }

      const choice = pool[Math.floor(rng() * pool.length)];
      const destinationCountry = getCountry(choice.id);

      if (destinationCountry) {
        next = {
          ...next,
          currentCountryId: destinationCountry.id,
          currentContinentId: destinationCountry.continentId,
          countryProgress: { ...next.countryProgress, [destinationCountry.id]: next.countryProgress[destinationCountry.id] ?? 0 },
        };
      }
    }
  }

  return next;
}

export function getRivalHistoryEventLabel(type: RivalHistoryEventType): string {
  switch (type) {
    case "level_up":
      return "Level Up";
    case "mastery_tier":
      return "Mastery Milestone";
    case "challenge_level_up":
      return "Challenge Level Up";
    case "dungeon_cleared":
      return "Dungeon Cleared";
    case "boss_defeated":
      return "Boss Defeated";
    case "country_conquered":
      return "Country Conquered";
    case "player_encounter":
      return "Player Encounter";
    default:
      return "Event";
  }
}
