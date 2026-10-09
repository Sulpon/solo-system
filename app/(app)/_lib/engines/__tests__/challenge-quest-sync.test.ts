import { describe, expect, it } from "vitest";
import { computeQuestLinkedEntries, getQuestLinkedMetricIds, isQuestLinkableMetric } from "../challenge-quest-sync";
import type { Challenge, ChallengeMetric } from "../../types/challenge";
import type { QuestCompletion } from "../../types/quest";

function challenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: "ch1",
    title: "No sugar",
    icon: "*",
    category: "health",
    status: "active",
    startDate: "2026-10-05",
    endDate: "2026-10-11",
    durationDays: 7,
    createdAt: "2026-10-05T00:00:00.000Z",
    ...overrides,
  };
}

function metric(overrides: Partial<ChallengeMetric> = {}): ChallengeMetric {
  return { id: "m1", challengeId: "ch1", name: "Stayed off sugar", type: "boolean", required: true, position: 0, ...overrides };
}

function completion(questId: string, dayKey: string): QuestCompletion {
  // Midday local time, so the day key is unambiguous regardless of timezone.
  return { id: `${questId}-${dayKey}`, questId, completedAt: new Date(`${dayKey}T12:00:00`).toISOString(), xpAwarded: 10 } as QuestCompletion;
}

const TODAY = new Date(2026, 9, 8); // 8 Oct 2026, inside the window

describe("isQuestLinkableMetric", () => {
  it("allows only boolean metrics, because a completion carries no value", () => {
    expect(isQuestLinkableMetric(metric({ type: "boolean" }))).toBe(true);
    for (const type of ["number", "rating", "text", "photo"] as const) {
      expect(isQuestLinkableMetric(metric({ type }))).toBe(false);
    }
  });
});

describe("computeQuestLinkedEntries", () => {
  const linked = metric({ linkedQuestId: "q1" });

  it("logs a day the linked quest was completed", () => {
    const result = computeQuestLinkedEntries({
      challenges: [challenge()],
      metrics: [linked],
      questCompletions: [completion("q1", "2026-10-06")],
      today: TODAY,
    });

    expect(result).toEqual([{ challengeId: "ch1", metricId: "m1", date: "2026-10-06" }]);
  });

  it("logs every completed day, and only those", () => {
    const result = computeQuestLinkedEntries({
      challenges: [challenge()],
      metrics: [linked],
      questCompletions: [completion("q1", "2026-10-05"), completion("q1", "2026-10-07")],
      today: TODAY,
    });

    expect(result.map((entry) => entry.date)).toEqual(["2026-10-05", "2026-10-07"]);
  });

  it("logs nothing when the quest was never completed - the undo case", () => {
    expect(computeQuestLinkedEntries({ challenges: [challenge()], metrics: [linked], questCompletions: [], today: TODAY })).toEqual([]);
  });

  it("ignores completions of a different quest", () => {
    expect(computeQuestLinkedEntries({ challenges: [challenge()], metrics: [linked], questCompletions: [completion("other", "2026-10-06")], today: TODAY })).toEqual([]);
  });

  it("ignores a metric with no link", () => {
    expect(computeQuestLinkedEntries({ challenges: [challenge()], metrics: [metric()], questCompletions: [completion("q1", "2026-10-06")], today: TODAY })).toEqual([]);
  });

  it("refuses to fill a non-boolean metric even when it is linked", () => {
    const numeric = metric({ type: "number", linkedQuestId: "q1" });

    expect(computeQuestLinkedEntries({ challenges: [challenge()], metrics: [numeric], questCompletions: [completion("q1", "2026-10-06")], today: TODAY })).toEqual([]);
  });

  it("never logs a day before the challenge started", () => {
    const result = computeQuestLinkedEntries({
      challenges: [challenge()],
      metrics: [linked],
      questCompletions: [completion("q1", "2026-10-01"), completion("q1", "2026-10-06")],
      today: TODAY,
    });

    expect(result.map((entry) => entry.date)).toEqual(["2026-10-06"]);
  });

  it("never logs a future day, even if a completion is dated ahead", () => {
    const result = computeQuestLinkedEntries({
      challenges: [challenge()],
      metrics: [linked],
      questCompletions: [completion("q1", "2026-10-10")],
      today: TODAY,
    });

    expect(result).toEqual([]);
  });

  it("stops at the challenge end date once it is past", () => {
    const result = computeQuestLinkedEntries({
      challenges: [challenge({ endDate: "2026-10-06" })],
      metrics: [linked],
      questCompletions: [completion("q1", "2026-10-06"), completion("q1", "2026-10-07")],
      today: TODAY,
    });

    expect(result.map((entry) => entry.date)).toEqual(["2026-10-06"]);
  });

  it("writes only to active challenges - history is not rewritten", () => {
    for (const status of ["draft", "completed", "abandoned"] as const) {
      const result = computeQuestLinkedEntries({
        challenges: [challenge({ status })],
        metrics: [linked],
        questCompletions: [completion("q1", "2026-10-06")],
        today: TODAY,
      });

      expect(result, `status ${status}`).toEqual([]);
    }
  });

  it("ignores a metric whose challenge no longer exists", () => {
    expect(computeQuestLinkedEntries({ challenges: [], metrics: [linked], questCompletions: [completion("q1", "2026-10-06")], today: TODAY })).toEqual([]);
  });

  it("feeds several metrics across several challenges from one quest", () => {
    const result = computeQuestLinkedEntries({
      challenges: [challenge(), challenge({ id: "ch2" })],
      metrics: [linked, metric({ id: "m2", challengeId: "ch2", linkedQuestId: "q1" })],
      questCompletions: [completion("q1", "2026-10-06")],
      today: TODAY,
    });

    expect(result).toHaveLength(2);
    expect(result.map((entry) => entry.challengeId).sort()).toEqual(["ch1", "ch2"]);
  });

  it("is stable - the same inputs always give the same result", () => {
    const input = { challenges: [challenge()], metrics: [linked], questCompletions: [completion("q1", "2026-10-06")], today: TODAY };

    expect(computeQuestLinkedEntries(input)).toEqual(computeQuestLinkedEntries(input));
  });
});

describe("getQuestLinkedMetricIds", () => {
  it("scopes the sync to linked boolean metrics only", () => {
    const ids = getQuestLinkedMetricIds([
      metric({ id: "a", linkedQuestId: "q1" }),
      metric({ id: "b" }),
      metric({ id: "c", type: "number", linkedQuestId: "q1" }),
    ]);

    expect([...ids]).toEqual(["a"]);
  });

  it("drops an unlinked metric from scope, so unlinking cannot delete logged days", () => {
    expect(getQuestLinkedMetricIds([metric({ id: "a" })]).has("a")).toBe(false);
  });
});
