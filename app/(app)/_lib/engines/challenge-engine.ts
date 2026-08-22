import { getLocalDayKey, parseLocalDayKey } from "../local-day";
import type { Challenge, ChallengeDayResult } from "../types/challenge";

// ---------------------------------------------------------------------------
// Settlement: turns real daily activity into Challenge results. A day is
// "settled" once, permanently, when it's in the past - never re-evaluated
// after the fact, so raising a level later can't retroactively change
// whether an old day passed. Today is never settled here; its progress is
// always shown live from the same activity data (see challenge-view below).
// ---------------------------------------------------------------------------

function nextDayKey(dayKey: string): string {
  const date = parseLocalDayKey(dayKey);
  date.setDate(date.getDate() + 1);
  return getLocalDayKey(date);
}

export function getCurrentLevel(challenge: Challenge) {
  return challenge.levels[Math.min(challenge.currentLevelIndex, challenge.levels.length - 1)] ?? null;
}

export function getNextLevel(challenge: Challenge) {
  return challenge.levels[challenge.currentLevelIndex + 1] ?? null;
}

// Pure function: given a challenge's current settlement state and a way to
// look up real activity for any day, walks forward from the day after
// lastSettledDate (or the challenge's creation day) through yesterday,
// appending one immutable ChallengeDayResult per day and advancing
// currentLevelIndex/currentStreak exactly as it goes - so "what was the
// target on that day" is always the target active at settlement time, not
// whatever the target happens to be now.
export function settleChallenge(challenge: Challenge, getActualValueForDay: (dayKey: string) => number, referenceDate = new Date()): Challenge {
  if (challenge.status !== "active" || challenge.levels.length === 0) {
    return challenge;
  }

  const todayKey = getLocalDayKey(referenceDate);
  let cursor = challenge.lastSettledDate ? nextDayKey(challenge.lastSettledDate) : getLocalDayKey(challenge.createdAt);

  let levelIndex = challenge.currentLevelIndex;
  let streak = challenge.currentStreak;
  const newEntries: ChallengeDayResult[] = [];

  // Bounded to avoid ever looping indefinitely on bad/corrupted dates.
  let guard = 0;

  while (cursor < todayKey && guard < 20000) {
    guard += 1;

    const target = challenge.levels[Math.min(levelIndex, challenge.levels.length - 1)].target;
    const actualValue = Math.max(0, getActualValueForDay(cursor));
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

    newEntries.push({ date: cursor, target, actualValue, passed, leveledUp });
    cursor = nextDayKey(cursor);
  }

  if (newEntries.length === 0) {
    return challenge;
  }

  return {
    ...challenge,
    history: [...challenge.history, ...newEntries],
    currentLevelIndex: levelIndex,
    currentStreak: streak,
    lastSettledDate: newEntries[newEntries.length - 1].date,
    updatedAt: new Date().toISOString(),
  };
}
