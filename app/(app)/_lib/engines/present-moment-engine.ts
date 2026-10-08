import type { CalendarQuestItem } from "./quest-calendar-engine";

// Groundwork for a Present-Moment / recommendation view, WITHOUT generating
// any recommendation. Every field is derived from data that already exists
// (today's Calendar items, the real active Focus/Quest session) - nothing
// is invented, nothing is persisted.
//
// The Priority Gate used to supply two more fields here
// (importantWorkComplete, remainingPriorityCategories). The gate has been
// removed from Atlas: any quest can be worked on at any time, so "which
// priority bucket is still open" is no longer a question this app asks.
export type PresentMomentState = Readonly<{
  hasActiveMission: boolean;
  // Today's remaining scheduled Quests/Tasks (Calendar's own "scheduled and
  // still ahead of now" items) - not a duplicate schedule, just a count.
  remainingScheduledToday: number;
  // The next scheduled commitment strictly after `now`, if any today.
  nextCommitment: Readonly<{ title: string; time: string }> | null;
  // Minutes of open, unscheduled time before that next commitment - null
  // when there's no more scheduled today (open-ended, not "zero").
  availableUnscheduledMinutes: number | null;
}>;

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function computePresentMomentState({
  todaysCalendarItems,
  hasActiveMission,
  now,
}: {
  todaysCalendarItems: ReadonlyArray<CalendarQuestItem>;
  hasActiveMission: boolean;
  now: Date;
}): PresentMomentState {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const upcoming = todaysCalendarItems
    .filter((item): item is typeof item & { startTime: string } => item.status === "scheduled" && item.startTime !== null)
    .map((item) => ({ item, minutes: timeToMinutes(item.startTime) }))
    .filter(({ minutes }) => minutes > nowMinutes)
    .sort((a, b) => a.minutes - b.minutes);

  const next = upcoming[0] ?? null;

  return {
    hasActiveMission,
    remainingScheduledToday: upcoming.length,
    nextCommitment: next ? { title: next.item.quest.title, time: next.item.startTime } : null,
    availableUnscheduledMinutes: next ? next.minutes - nowMinutes : null,
  };
}
