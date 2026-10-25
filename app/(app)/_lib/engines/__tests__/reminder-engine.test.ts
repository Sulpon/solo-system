import { describe, expect, it } from "vitest";
import { buildReminderDedupeKey, computeUpcomingReminders, DEFAULT_LEAD_MINUTES, MAX_REMINDERS } from "../reminder-engine";
import type { Quest, QuestCompletion } from "../../types/quest";

// A reminder that fires at the wrong moment is worse than none: it trains
// the user to ignore the app. These pin the two things that decide the
// moment - the lead time, and never scheduling into the past.

const MONDAY = new Date("2026-10-26T06:00:00");

// A quest only lands on a date through scheduledDate or scheduledDays -
// cadence alone does not place it on the calendar (see getQuestsForDate).
// Every-day recurrence is therefore all seven weekdays.
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

function quest(overrides: Partial<Quest> = {}): Quest {
  return {
    id: "q1",
    title: "Morning mobility",
    categoryId: "physical-health",
    xp: 25,
    cadence: "daily",
    scheduledDays: EVERY_DAY,
    status: "active",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  } as unknown as Quest;
}

function minutesBetween(a: string, b: Date): number {
  return Math.round((new Date(a).getTime() - b.getTime()) / 60000);
}

describe("computeUpcomingReminders", () => {
  it("schedules a reminder ahead of a timed quest by the lead time", () => {
    const reminders = computeUpcomingReminders([quest({ scheduledStartTime: "08:00" })], [], { from: MONDAY, horizonDays: 1 });

    expect(reminders).toHaveLength(1);

    const sendAt = new Date(reminders[0].sendAt);
    expect(sendAt.getHours()).toBe(7);
    expect(sendAt.getMinutes()).toBe(60 - DEFAULT_LEAD_MINUTES);
  });

  it("honours a custom lead time", () => {
    const reminders = computeUpcomingReminders([quest({ scheduledStartTime: "09:00" })], [], { from: MONDAY, horizonDays: 1, leadMinutes: 30 });
    const sendAt = new Date(reminders[0].sendAt);

    expect(sendAt.getHours()).toBe(8);
    expect(sendAt.getMinutes()).toBe(30);
  });

  it("fires exactly at the start when the lead time is zero", () => {
    const reminders = computeUpcomingReminders([quest({ scheduledStartTime: "09:00" })], [], { from: MONDAY, horizonDays: 1, leadMinutes: 0 });
    const sendAt = new Date(reminders[0].sendAt);

    expect(sendAt.getHours()).toBe(9);
    expect(sendAt.getMinutes()).toBe(0);
  });

  it("ignores an all-day quest, which has no moment to interrupt at", () => {
    expect(computeUpcomingReminders([quest({})], [], { from: MONDAY, horizonDays: 1 })).toHaveLength(0);
  });

  it("never schedules into the past", () => {
    // 06:00 now, quest at 05:00 - that moment is gone. Scheduling it would
    // make the server fire immediately for something already missed.
    const reminders = computeUpcomingReminders([quest({ scheduledStartTime: "05:00" })], [], { from: MONDAY, horizonDays: 1 });

    expect(reminders).toHaveLength(0);
  });

  it("never schedules a reminder whose lead time has already elapsed", () => {
    // Quest at 06:05, lead 10 minutes -> the send moment was 05:55, past.
    const reminders = computeUpcomingReminders([quest({ scheduledStartTime: "06:05" })], [], { from: MONDAY, horizonDays: 1 });

    expect(reminders).toHaveLength(0);
  });

  it("every reminder it returns is in the future", () => {
    const reminders = computeUpcomingReminders([quest({ scheduledStartTime: "08:00" })], [], { from: MONDAY, horizonDays: 7 });

    expect(reminders.length).toBeGreaterThan(1);
    for (const reminder of reminders) {
      expect(minutesBetween(reminder.sendAt, MONDAY)).toBeGreaterThan(0);
    }
  });

  it("repeats a daily quest across the horizon, once per day", () => {
    const reminders = computeUpcomingReminders([quest({ scheduledStartTime: "08:00" })], [], { from: MONDAY, horizonDays: 5 });

    expect(reminders).toHaveLength(5);
    expect(new Set(reminders.map((reminder) => reminder.dedupeKey)).size).toBe(5);
  });

  it("skips an occurrence that is already completed", () => {
    const completion = {
      id: "c1",
      questId: "q1",
      completedAt: new Date("2026-10-26T07:30:00").toISOString(),
      xpAwarded: 25,
      streakBonusXp: 0,
      attributeRewardsAwarded: [],
    } as unknown as QuestCompletion;

    const reminders = computeUpcomingReminders([quest({ scheduledStartTime: "20:00" })], [completion], { from: MONDAY, horizonDays: 1 });

    expect(reminders).toHaveLength(0);
  });

  it("gives the same occurrence the same key every time, so re-uploading updates rather than duplicates", () => {
    const first = computeUpcomingReminders([quest({ scheduledStartTime: "08:00" })], [], { from: MONDAY, horizonDays: 3 });
    const second = computeUpcomingReminders([quest({ scheduledStartTime: "08:00" })], [], { from: MONDAY, horizonDays: 3 });

    expect(first.map((r) => r.dedupeKey)).toEqual(second.map((r) => r.dedupeKey));
  });

  it("gives a retimed quest a different key, so the old reminder is replaced", () => {
    const at8 = computeUpcomingReminders([quest({ scheduledStartTime: "08:00" })], [], { from: MONDAY, horizonDays: 1 });
    const at9 = computeUpcomingReminders([quest({ scheduledStartTime: "09:00" })], [], { from: MONDAY, horizonDays: 1 });

    expect(at8[0].dedupeKey).not.toBe(at9[0].dedupeKey);
  });

  it("builds a key from quest, day and time", () => {
    expect(buildReminderDedupeKey("q1", "2026-10-26", "08:00")).toBe("q1|2026-10-26|08:00");
  });

  it("carries the quest title so the notification can name it", () => {
    const reminders = computeUpcomingReminders([quest({ title: "Deep work block", scheduledStartTime: "08:00" })], [], { from: MONDAY, horizonDays: 1 });

    expect(reminders[0].title).toBe("Deep work block");
    expect(reminders[0].body).toContain("08:00");
  });

  it("caps the number of reminders so one account cannot flood the queue", () => {
    const many = Array.from({ length: 200 }, (_, index) => quest({ id: `q${index}`, scheduledStartTime: "08:00" }));
    const reminders = computeUpcomingReminders(many, [], { from: MONDAY, horizonDays: 14, maxReminders: 50 });

    expect(reminders).toHaveLength(50);
  });

  it("has a default cap", () => {
    expect(MAX_REMINDERS).toBeGreaterThan(0);
  });

  it("returns nothing for an empty quest list", () => {
    expect(computeUpcomingReminders([], [], { from: MONDAY })).toEqual([]);
  });

  it("tolerates a malformed time instead of throwing", () => {
    expect(() => computeUpcomingReminders([quest({ scheduledStartTime: "not-a-time" })], [], { from: MONDAY, horizonDays: 1 })).not.toThrow();
    expect(computeUpcomingReminders([quest({ scheduledStartTime: "not-a-time" })], [], { from: MONDAY, horizonDays: 1 })).toHaveLength(0);
  });
});
