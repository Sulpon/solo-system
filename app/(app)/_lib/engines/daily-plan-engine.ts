import { getLocalDayKey, parseLocalDayKey } from "../local-day";
import type { CalendarQuestItem } from "./quest-calendar-engine";
import type { GoalNode, GoalTree } from "../types/goal-tree";

// What today actually looks like, derived from records Atlas already has.
//
// Everything here counts real Quests and real completions. There is no
// estimated-effort field on a Quest, so nothing in this module invents how
// long anything "should" take - the only minutes it reports are the ones a
// scheduled start and end time genuinely span.

const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

export function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const match = TIME_PATTERN.exec(value.trim());

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

// Only a block with BOTH ends can report a duration. A quest pinned to a
// start time with no end is still shown on the timeline; it just does not
// pretend to occupy a measurable amount of the day.
export function getBlockMinutes(item: Pick<CalendarQuestItem, "startTime" | "endTime">): number | null {
  const start = parseTimeToMinutes(item.startTime);
  const end = parseTimeToMinutes(item.endTime);

  if (start === null || end === null || end <= start) {
    return null;
  }

  return end - start;
}

export type DaySummary = Readonly<{
  total: number;
  completed: number;
  remaining: number;
  // Minutes across blocks that have a real start AND end time.
  plannedMinutes: number;
  completedMinutes: number;
  // How many of today's items carry no measurable block, so the UI can say
  // the planned figure covers only part of the day instead of implying it
  // covers all of it.
  untimedCount: number;
}>;

export function summariseDay(items: ReadonlyArray<CalendarQuestItem>): DaySummary {
  let completed = 0;
  let plannedMinutes = 0;
  let completedMinutes = 0;
  let untimedCount = 0;

  for (const item of items) {
    const minutes = getBlockMinutes(item);
    const isDone = item.status === "completed";

    if (isDone) {
      completed += 1;
    }

    if (minutes === null) {
      untimedCount += 1;
    } else {
      plannedMinutes += minutes;

      if (isDone) {
        completedMinutes += minutes;
      }
    }
  }

  return { total: items.length, completed, remaining: items.length - completed, plannedMinutes, completedMinutes, untimedCount };
}

export function formatMinutes(minutes: number): string {
  if (minutes <= 0) {
    return "0m";
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) {
    return `${rest}m`;
  }

  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export type UpcomingDeadline = Readonly<{ node: GoalNode; dueKey: string; daysLeft: number; isOverdue: boolean }>;

function daysBetween(fromKey: string, toKey: string): number {
  const from = parseLocalDayKey(fromKey);
  const to = parseLocalDayKey(toKey);
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

// Goals whose period ends soon, or has already ended with work left.
// Sorted by how close they are, soonest first. Only real periodEnd values -
// a goal with no end date is not a deadline.
export function getUpcomingDeadlines(tree: GoalTree, today: Date = new Date(), withinDays = 14): UpcomingDeadline[] {
  const todayKey = getLocalDayKey(today);
  const found: UpcomingDeadline[] = [];

  function walk(nodes: GoalTree) {
    for (const node of nodes) {
      const isDone = node.status === "completed" || node.progress >= 100;

      if (!isDone && node.periodEnd) {
        const daysLeft = daysBetween(todayKey, node.periodEnd);

        if (daysLeft <= withinDays) {
          found.push({ node, dueKey: node.periodEnd, daysLeft, isOverdue: daysLeft < 0 });
        }
      }

      walk(node.children ?? []);
    }
  }

  walk(tree);
  return found.sort((first, second) => first.daysLeft - second.daysLeft);
}
