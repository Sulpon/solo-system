import { getLocalDayKey, parseLocalDayKey } from "../local-day";
import type { QuestChallengeConfig, QuestCompletion } from "../types/quest";
import type { Challenge } from "../types/challenge";

// Structural rather than the full Quest type, so both Quest and its reduced
// DailyQuest projection (used by Dashboard widgets) can be passed directly.
export type ChallengeSource = Readonly<{
  id: string;
  createdAt?: string;
  challenge?: QuestChallengeConfig;
}>;

// ---------------------------------------------------------------------------
// A Challenge's level/streak are never stored - they're derived fresh from
// the same QuestCompletion history that already drives Quest streaks (see
// calculateQuestStreak in daily-system.ts), just walked forward against the
// Challenge's level targets. This means there is no separate settlement
// state to keep in sync or let drift: editing/undoing a past completion is
// immediately reflected the next time this is called, and a level-up can
// never retroactively change whether an earlier day passed, because each
// day is evaluated in chronological order using whatever level was active
// at that point in the walk.
// ---------------------------------------------------------------------------

export type ChallengeDayResult = Readonly<{
  date: string;
  target: number;
  actualValue: number;
  passed: boolean;
  leveledUp: boolean;
}>;

export type ChallengeProgress = Readonly<{
  currentLevelIndex: number;
  currentStreak: number;
  history: ReadonlyArray<ChallengeDayResult>;
  todayValue: number;
  todayTarget: number;
  // True once today has an actual completion - at that point today's
  // target was genuinely hit or missed, so pass/fail feedback (and any
  // streak reset) is immediate rather than waiting for tomorrow.
  todaySettled: boolean;
  todayPassed: boolean;
}>;

function nextDayKey(dayKey: string): string {
  const date = parseLocalDayKey(dayKey);
  date.setDate(date.getDate() + 1);
  return getLocalDayKey(date);
}

function getMetricValueForDay(completions: ReadonlyArray<QuestCompletion>, questId: string, dayKey: string): number {
  const completion = completions.find((item) => item.questId === questId && getLocalDayKey(item.completedAt) === dayKey);

  if (!completion) {
    return 0;
  }

  return Math.max(0, Number(completion.metricValue ?? 1));
}

export function deriveChallengeProgress(quest: ChallengeSource, completions: ReadonlyArray<QuestCompletion>, referenceDate = new Date()): ChallengeProgress | null {
  const challenge = quest.challenge;

  if (!challenge?.enabled || challenge.levels.length === 0 || !quest.createdAt) {
    return null;
  }

  const todayKey = getLocalDayKey(referenceDate);
  // Today is only walked (and therefore settled) once it actually has a
  // completion - an in-progress day is never fabricated as a fail just
  // because it isn't over yet. Once completed, today's real value is known,
  // so its pass/fail (and any streak reset) is immediate, matching how a
  // finished Quest completion behaves everywhere else in the app.
  const todayHasCompletion = completions.some((item) => item.questId === quest.id && getLocalDayKey(item.completedAt) === todayKey);
  const endKeyExclusive = todayHasCompletion ? nextDayKey(todayKey) : todayKey;

  let cursor = getLocalDayKey(quest.createdAt);
  let levelIndex = 0;
  let streak = 0;
  const history: ChallengeDayResult[] = [];

  // Bounded so a corrupted createdAt can never loop indefinitely.
  let guard = 0;

  while (cursor < endKeyExclusive && guard < 20000) {
    guard += 1;

    const target = challenge.levels[Math.min(levelIndex, challenge.levels.length - 1)].target;
    const actualValue = getMetricValueForDay(completions, quest.id, cursor);
    const passed = actualValue >= target;
    let leveledUp = false;

    if (passed) {
      streak += 1;

      if (streak >= challenge.requiredStreak && levelIndex < challenge.levels.length - 1) {
        levelIndex += 1;
        streak = 0;
        leveledUp = true;
      }
    } else {
      streak = 0;
    }

    history.push({ date: cursor, target, actualValue, passed, leveledUp });
    cursor = nextDayKey(cursor);
  }

  const todayEntry = todayHasCompletion ? history[history.length - 1] : undefined;
  const todayTarget = todayEntry?.target ?? challenge.levels[Math.min(levelIndex, challenge.levels.length - 1)].target;
  const todayValue = todayEntry?.actualValue ?? getMetricValueForDay(completions, quest.id, todayKey);

  return {
    currentLevelIndex: levelIndex,
    currentStreak: streak,
    history,
    todayValue,
    todayTarget,
    todaySettled: todayHasCompletion,
    todayPassed: todayEntry?.passed ?? false,
  };
}

// ---- Legacy record handling -----------------------------------------------
//
// Challenges were redesigned into fixed-duration missions (startDate /
// endDate / durationDays). Records written by the earlier streak-and-levels
// design are still in localStorage and carry none of those fields, so
// anything that reads them - getChallengeDayNumber in particular, via
// parseLocalDayKey(challenge.startDate) - throws
// "Cannot read properties of undefined (reading 'split')" and takes the
// whole Challenges page down.
//
// These records are NOT migrated and NOT deleted. There is no honest source
// for durationDays in the old shape (it had levels and a required streak,
// not a fixed length), and inventing one would show fabricated progress
// like "Day 3 of 21". They are simply held back from the UI and reported,
// so the data survives untouched and the page works.

const REQUIRED_CHALLENGE_FIELDS = ["id", "title", "status", "startDate", "endDate", "durationDays", "createdAt"] as const;

export function isReadableChallenge(candidate: unknown): candidate is Challenge {
  if (typeof candidate !== "object" || candidate === null) return false;

  const record = candidate as Record<string, unknown>;

  return REQUIRED_CHALLENGE_FIELDS.every((field) => {
    const value = record[field];
    if (field === "durationDays") return typeof value === "number" && Number.isFinite(value) && value > 0;
    return typeof value === "string" && value.length > 0;
  });
}

export type PartitionedChallenges = Readonly<{
  readable: ReadonlyArray<Challenge>;
  // Kept so the UI can say how many records it is holding back, without
  // claiming to understand them.
  unreadable: ReadonlyArray<Readonly<{ id: string; title: string }>>;
}>;

export function partitionChallenges(stored: ReadonlyArray<unknown>): PartitionedChallenges {
  const readable: Challenge[] = [];
  const unreadable: Array<{ id: string; title: string }> = [];

  for (const candidate of stored) {
    if (isReadableChallenge(candidate)) {
      readable.push(candidate);
      continue;
    }

    const record = (typeof candidate === "object" && candidate !== null ? candidate : {}) as Record<string, unknown>;
    unreadable.push({
      id: typeof record.id === "string" ? record.id : "",
      title: typeof record.title === "string" && record.title.length > 0 ? record.title : "Untitled challenge",
    });
  }

  return { readable, unreadable };
}
