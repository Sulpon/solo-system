import { describe, expect, it } from "vitest";
import { isReadableChallenge, partitionChallenges } from "../challenge-engine";
import { getChallengeDayNumber } from "../challenge-mission-engine";
import type { Challenge } from "../../types/challenge";

// Regression for "Cannot read properties of undefined (reading 'split')" on
// the Challenges page: a record written by the pre-redesign Challenge shape
// has no startDate, so getChallengeDayNumber -> parseLocalDayKey(undefined)
// threw and took the whole page down.

function currentSchema(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: "c1",
    title: "Cold showers",
    icon: "*",
    category: "discipline",
    status: "active",
    startDate: "2026-10-01",
    endDate: "2026-10-21",
    durationDays: 21,
    createdAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

// The exact shape found in the user's real stored data.
const LEGACY_RECORD = {
  id: "legacy-1",
  title: "Old streak challenge",
  description: "",
  linkedQuestId: "quest-1",
  metricSource: "something",
  unit: "reps",
  levels: [],
  currentLevelIndex: 0,
  currentStreak: 3,
  requiredStreak: 7,
  status: "active",
  history: [],
  lastSettledDate: "2026-09-01",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

describe("isReadableChallenge", () => {
  it("accepts a current-schema challenge", () => {
    expect(isReadableChallenge(currentSchema())).toBe(true);
  });

  it("rejects the real legacy record that crashed the page", () => {
    expect(isReadableChallenge(LEGACY_RECORD)).toBe(false);
  });

  it("rejects a record missing any single required date field", () => {
    expect(isReadableChallenge({ ...currentSchema(), startDate: undefined })).toBe(false);
    expect(isReadableChallenge({ ...currentSchema(), endDate: undefined })).toBe(false);
    expect(isReadableChallenge({ ...currentSchema(), createdAt: undefined })).toBe(false);
  });

  it("rejects an empty string where a date key is required, not just undefined", () => {
    expect(isReadableChallenge({ ...currentSchema(), startDate: "" })).toBe(false);
  });

  it("requires a usable positive durationDays", () => {
    expect(isReadableChallenge({ ...currentSchema(), durationDays: undefined })).toBe(false);
    expect(isReadableChallenge({ ...currentSchema(), durationDays: 0 })).toBe(false);
    expect(isReadableChallenge({ ...currentSchema(), durationDays: "21" })).toBe(false);
    expect(isReadableChallenge({ ...currentSchema(), durationDays: Number.NaN })).toBe(false);
  });

  it("rejects non-objects without throwing", () => {
    expect(isReadableChallenge(null)).toBe(false);
    expect(isReadableChallenge(undefined)).toBe(false);
    expect(isReadableChallenge("challenge")).toBe(false);
    expect(isReadableChallenge(42)).toBe(false);
  });
});

describe("partitionChallenges", () => {
  it("separates readable records from legacy ones without losing either", () => {
    const result = partitionChallenges([currentSchema(), LEGACY_RECORD, currentSchema({ id: "c2" })]);

    expect(result.readable.map((entry) => entry.id)).toEqual(["c1", "c2"]);
    expect(result.unreadable).toEqual([{ id: "legacy-1", title: "Old streak challenge" }]);
  });

  it("keeps a usable label for a legacy record with no title", () => {
    expect(partitionChallenges([{ id: "x" }]).unreadable).toEqual([{ id: "x", title: "Untitled challenge" }]);
  });

  it("survives junk entries rather than throwing", () => {
    const result = partitionChallenges([null, "nonsense", 7, currentSchema()]);

    expect(result.readable).toHaveLength(1);
    expect(result.unreadable).toHaveLength(3);
  });

  it("returns empty partitions for empty storage", () => {
    expect(partitionChallenges([])).toEqual({ readable: [], unreadable: [] });
  });
});

describe("the original crash", () => {
  it("getChallengeDayNumber still throws on a legacy record - which is why it is filtered out upstream", () => {
    expect(() => getChallengeDayNumber(LEGACY_RECORD as unknown as Challenge)).toThrow();
  });

  it("works normally once only readable records reach it", () => {
    const { readable } = partitionChallenges([LEGACY_RECORD, currentSchema({ startDate: "2026-10-01", durationDays: 21 })]);

    expect(readable).toHaveLength(1);
    expect(() => getChallengeDayNumber(readable[0], new Date(2026, 9, 3))).not.toThrow();
    expect(getChallengeDayNumber(readable[0], new Date(2026, 9, 3))).toBe(3);
  });
});
