import { getQuestsForDate } from "./quest-calendar-engine";
import { getLocalDayKey } from "../local-day";
import { parseTimeToMinutes } from "./daily-plan-engine";
import type { Quest, QuestCompletion } from "../types/quest";

// Turning "this quest is scheduled at 08:00" into "send a push at 07:50 on
// the 3rd" - the list a server can act on while Atlas is closed.
//
// WHY THE CLIENT COMPUTES THIS
//
// Recurrence lives entirely in the client: cadence, scheduledDays and
// scheduledDate are interpreted by quest-calendar-engine, against the
// device's own timezone. Reimplementing that in SQL or in an Edge Function
// would mean two recurrence engines that must agree forever, and they
// would not. So the client resolves occurrences into plain absolute
// timestamps and uploads those; the server only ever asks "is send_at in
// the past yet", which needs no knowledge of Atlas at all.
//
// The cost is that reminders only extend as far as the horizon the client
// last uploaded. A device that never opens again eventually runs out of
// scheduled pushes, which is the correct failure: silence, not a stream of
// notifications for a life the user stopped recording.

// Far enough ahead that a week away from the app still gets reminders,
// short enough that a changed schedule is not wrong for long.
export const REMINDER_HORIZON_DAYS = 14;

// A reminder is useful slightly BEFORE the thing it is reminding you about.
export const DEFAULT_LEAD_MINUTES = 10;

export type ScheduledReminder = Readonly<{
  // Stable across recomputation, so re-uploading the same schedule updates
  // rows instead of duplicating them. Includes the time, so moving a quest
  // to a new slot produces a genuinely new reminder rather than silently
  // editing the old one.
  dedupeKey: string;
  questId: string;
  title: string;
  body: string;
  sendAt: string;
  url: string;
}>;

export type ReminderOptions = Readonly<{
  from?: Date;
  horizonDays?: number;
  leadMinutes?: number;
  // A ceiling, so a user with hundreds of daily quests cannot push an
  // unbounded number of rows at the server.
  maxReminders?: number;
}>;

export const MAX_REMINDERS = 500;

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

// Local time on purpose: "08:00" means eight in the morning where the user
// is, and the absolute instant that corresponds to is exactly what the
// server needs.
function occurrenceAt(day: Date, time: string): Date | null {
  const minutes = parseTimeToMinutes(time);

  if (minutes === null) {
    return null;
  }

  const at = startOfDay(day);
  at.setMinutes(minutes);
  return at;
}

export function buildReminderDedupeKey(questId: string, dayKey: string, startTime: string): string {
  return `${questId}|${dayKey}|${startTime}`;
}

export function computeUpcomingReminders(
  quests: ReadonlyArray<Quest>,
  completions: ReadonlyArray<QuestCompletion>,
  options: ReminderOptions = {},
): ScheduledReminder[] {
  const from = options.from ?? new Date();
  const horizonDays = options.horizonDays ?? REMINDER_HORIZON_DAYS;
  const leadMinutes = Math.max(0, options.leadMinutes ?? DEFAULT_LEAD_MINUTES);
  const maxReminders = options.maxReminders ?? MAX_REMINDERS;

  const reminders: ScheduledReminder[] = [];

  for (let offset = 0; offset < horizonDays; offset += 1) {
    const day = addDays(from, offset);
    const dayKey = getLocalDayKey(day);

    for (const item of getQuestsForDate(quests, completions, day, from)) {
      if (!item.startTime) {
        // All-day work has no moment to interrupt someone at.
        continue;
      }

      if (item.status === "completed") {
        continue;
      }

      const occurrence = occurrenceAt(day, item.startTime);

      if (!occurrence) {
        continue;
      }

      const sendAt = new Date(occurrence.getTime() - leadMinutes * 60_000);

      // Never schedule into the past: the server would fire it immediately,
      // which is how a user ends up with a burst of notifications for
      // things that already happened.
      if (sendAt.getTime() <= from.getTime()) {
        continue;
      }

      reminders.push({
        dedupeKey: buildReminderDedupeKey(item.quest.id, dayKey, item.startTime),
        questId: item.quest.id,
        title: item.quest.title,
        body: leadMinutes > 0 ? `Starts at ${item.startTime}` : `Scheduled for ${item.startTime}`,
        sendAt: sendAt.toISOString(),
        url: "/planning",
      });

      if (reminders.length >= maxReminders) {
        return reminders;
      }
    }
  }

  return reminders;
}
