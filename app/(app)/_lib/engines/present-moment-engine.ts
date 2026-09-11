import type { PriorityGateState } from "./priority-gate-engine";
import type { CalendarQuestItem } from "./quest-calendar-engine";

// Section 8 of the Atlas OS Phase 3 spec: groundwork for a future
// Present-Moment / recommendation engine, WITHOUT generating any
// recommendation yet. Every field here is derived from data that already
// exists (Priority Gate state, today's Calendar items, the real active
// Focus/Quest session) - nothing is invented, nothing is persisted, this is
// a pure read-derivation over state useAtlasContext() already assembles.
export type PresentMomentState = Readonly<{
  // "Today's important work" == the Priority Gate's Q1->Q3->Q2->Q4 chain -
  // true once every quadrant with assigned Tasks is cleared (currentQuadrant
  // is null). False (not "unknown") when there's no Priority Gate state to
  // evaluate yet (e.g. before Quest data has loaded).
  importantWorkComplete: boolean;
  hasActiveMission: boolean;
  // Today's remaining scheduled Quests/Tasks (Calendar's own "scheduled and
  // still ahead of now" items) - not a duplicate schedule, just a count.
  remainingScheduledToday: number;
  // How many Priority Gate quadrants (of those with assigned Tasks) are
  // still not cleared - 0 exactly when importantWorkComplete is true.
  remainingPriorityCategories: number;
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
  gateState,
  todaysCalendarItems,
  hasActiveMission,
  now,
}: {
  gateState: PriorityGateState | null;
  todaysCalendarItems: ReadonlyArray<CalendarQuestItem>;
  hasActiveMission: boolean;
  now: Date;
}): PresentMomentState {
  const remainingPriorityCategories = gateState ? gateState.quadrantStatuses.filter((status) => !status.cleared).length : 0;
  const importantWorkComplete = gateState !== null && gateState.currentQuadrant === null;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const upcoming = todaysCalendarItems
    .filter((item): item is typeof item & { startTime: string } => item.status === "scheduled" && item.startTime !== null)
    .map((item) => ({ item, minutes: timeToMinutes(item.startTime) }))
    .filter(({ minutes }) => minutes > nowMinutes)
    .sort((a, b) => a.minutes - b.minutes);

  const next = upcoming[0] ?? null;

  return {
    importantWorkComplete,
    hasActiveMission,
    remainingScheduledToday: upcoming.length,
    remainingPriorityCategories,
    nextCommitment: next ? { title: next.item.quest.title, time: next.item.startTime } : null,
    availableUnscheduledMinutes: next ? next.minutes - nowMinutes : null,
  };
}
