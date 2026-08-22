// A Challenge is a measurable daily target layered on top of real activity
// data (see goal-metrics.ts) - distinct from a Quest (boolean "did it
// happen") and from a progress_goal milestone (cumulative lifetime total).
// A Challenge asks "did today's activity meet the bar", tracks a
// streak-gated level ladder, and never touches Quest data or XP.

export type ChallengeLevel = Readonly<{ target: number }>;

export type ChallengeStatus = "active" | "paused" | "archived";

// One settled, immutable day. Stores the target that was actually active
// that day (not "whatever the target is now") so history never rewrites
// itself as the challenge levels up later.
export type ChallengeDayResult = Readonly<{
  date: string; // local day key
  target: number;
  actualValue: number;
  passed: boolean;
  leveledUp: boolean;
}>;

export type Challenge = Readonly<{
  id: string;
  title: string;
  description?: string;
  // Optional, purely informational - lets a Challenge point at an existing
  // Quest for display continuity. Never read for pass/fail math, never
  // written to.
  linkedQuestId?: string | null;
  // Key into the goal-metrics.ts registry - the real activity source.
  metricSource: string;
  unit: string;
  levels: ReadonlyArray<ChallengeLevel>;
  currentLevelIndex: number;
  // Recomputed only by settleChallenge() in challenge-engine.ts - never
  // hand-edited, so it can't drift from the history it summarizes.
  currentStreak: number;
  requiredStreak: number;
  status: ChallengeStatus;
  history: ReadonlyArray<ChallengeDayResult>;
  lastSettledDate: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export function createChallengeId() {
  return `challenge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createChallenge(input: {
  title: string;
  description?: string;
  metricSource: string;
  unit: string;
  levels: ReadonlyArray<ChallengeLevel>;
  requiredStreak: number;
  linkedQuestId?: string | null;
}): Challenge {
  const now = new Date().toISOString();

  return {
    id: createChallengeId(),
    title: input.title,
    description: input.description,
    linkedQuestId: input.linkedQuestId ?? null,
    metricSource: input.metricSource,
    unit: input.unit,
    levels: input.levels,
    currentLevelIndex: 0,
    currentStreak: 0,
    requiredStreak: input.requiredStreak,
    status: "active",
    history: [],
    lastSettledDate: null,
    createdAt: now,
    updatedAt: now,
  };
}
