import { getLocalDayKey } from "./local-day";
import type { XpEvent } from "./types/progression";
import type { Quest, QuestCompletion } from "./types/quest";

export type XpLedgerEntry = Readonly<{
  id: string;
  title: string;
  amount: number;
  timestamp: string;
}>;

// Single source of truth for "what XP was earned on this day" - reads the
// exact same records that already power totalXP (QuestCompletion.xpAwarded,
// goalXpEvents, bonusXpEvents), never recalculates. Shared by the Dashboard
// catalog widget and the Quests page XP Ledger modal so the two never drift.
export function getXpLedgerEntriesForDay(
  questDefinitions: ReadonlyArray<Quest>,
  questCompletions: ReadonlyArray<QuestCompletion>,
  goalXpEvents: ReadonlyArray<XpEvent>,
  bonusXpEvents: ReadonlyArray<XpEvent>,
  referenceDate = new Date(),
): XpLedgerEntry[] {
  const dayKey = getLocalDayKey(referenceDate);
  const questById = new Map(questDefinitions.map((quest) => [quest.id, quest]));

  const questEntries: XpLedgerEntry[] = questCompletions
    .filter((completion) => getLocalDayKey(completion.completedAt) === dayKey)
    .map((completion) => ({
      id: completion.id,
      title: questById.get(completion.questId)?.title ?? "Quest",
      amount: completion.xpAwarded,
      timestamp: completion.completedAt,
    }));

  const eventEntries: XpLedgerEntry[] = [...goalXpEvents, ...bonusXpEvents]
    .filter((event) => getLocalDayKey(event.createdAt) === dayKey)
    .map((event) => ({ id: event.id, title: event.sourceTitle, amount: event.amount, timestamp: event.createdAt }));

  return [...questEntries, ...eventEntries].sort((first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime());
}

export function getXpLedgerTotal(entries: ReadonlyArray<XpLedgerEntry>): number {
  return entries.reduce((sum, entry) => sum + entry.amount, 0);
}
