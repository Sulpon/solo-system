// Which quests the user has manually put on which calendar day. Quest
// itself has no date field (see types/quest.ts) and this is deliberately
// not one - a placement just says "show this quest on this day," nothing
// about the quest changes, and removing a placement never deletes the
// quest or any of its history. Completed quests bypass this entirely and
// always show on their real completion day (see quest-calendar-engine.ts).
export type CalendarPlacement = Readonly<{
  id: string;
  questId: string;
  date: string; // local day key, YYYY-MM-DD
  createdAt: string;
}>;
