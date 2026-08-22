import { getLocalDayKey, parseLocalDayKey } from "../local-day";
import type { QuestChallengeConfig, QuestCompletion } from "../types/quest";

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
