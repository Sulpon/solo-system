// Challenges: temporary, fixed-duration missions with daily-logged metrics.
// NOT the same concept as the per-Quest streak-leveling "challenge" already
// in engines/challenge-engine.ts (QuestChallengeConfig/ChallengeProgress) -
// that is an indefinite XP mini-game attached to one Quest. This is a
// standalone, dateD-bounded mission with its own lifecycle, never wired into
// XP/attributes/mastery. Keep the two apart; do not import both into the
// same file without aliasing one of them.

export type ChallengeStatus = "draft" | "active" | "completed" | "abandoned";

export type ChallengeMetricType = "boolean" | "number" | "rating" | "text" | "photo";

// Rating is always 0-10, matching every example in the product spec - not
// user-configurable, to avoid a knob nobody asked for.
export const CHALLENGE_RATING_MAX = 10;

export type ChallengeMetric = Readonly<{
  id: string;
  challengeId: string;
  name: string;
  type: ChallengeMetricType;
  // Optional target value for number/rating metrics (e.g. 0 cigarettes, 8/10
  // skin condition). Purely informational context shown next to the metric -
  // never enforced or auto-graded.
  target?: number;
  unit?: string;
  required: boolean;
  position: number;
}>;

// One logged value for one metric on one day. Exactly one of `value`/
// `photoId` is meaningful, depending on the metric's type:
// boolean -> value: 0 | 1, number/rating -> value: number, text -> value:
// string, photo -> photoId (document-store.ts id).
export type ChallengeEntry = Readonly<{
  id: string;
  challengeId: string;
  metricId: string;
  date: string;
  value?: number | string;
  photoId?: string;
  createdAt: string;
  updatedAt: string;
}>;

export type ChallengeReview = Readonly<{
  whatChanged?: string;
  whatLearned?: string;
  completedAt: string;
}>;

export type Challenge = Readonly<{
  id: string;
  title: string;
  description?: string;
  // Free-text glyph/emoji, e.g. "skin", not a constrained icon set - this app
  // has no icon library, only short text/letter badges.
  icon: string;
  category: string;
  tags?: ReadonlyArray<string>;
  status: ChallengeStatus;
  // Fixed once the challenge is active - see challenge-mission-engine.ts.
  startDate: string;
  endDate: string;
  durationDays: number;
  createdAt: string;
  completedAt?: string;
  review?: ChallengeReview;
}>;
