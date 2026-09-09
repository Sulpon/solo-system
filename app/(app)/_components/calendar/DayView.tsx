"use client";

import type { CalendarDayCell, QuestSchedulePatch } from "../../_lib/engines/quest-calendar-engine";
import type { Quest } from "../../_lib/types/quest";
import CalendarTimeGrid from "./CalendarTimeGrid";
import AssignExistingQuestPicker from "./AssignExistingQuestPicker";

type DayViewProps = Readonly<{
  cell: CalendarDayCell;
  todayKey: string;
  onOpenQuest: (questId: string) => void;
  onCreateRange: (dayKey: string, startTime: string, endTime: string) => void;
  onReschedule: (questId: string, patch: QuestSchedulePatch) => void;
  onAddQuest: () => void;
  availableQuests: ReadonlyArray<Quest>;
  onAssignQuest: (questId: string) => void;
}>;

// The precise, single-day scheduler - same CalendarTimeGrid as Week (1
// column instead of 7). Click-to-create/drag-to-create/drag-to-move/resize
// all come from the grid itself; "+ New Quest" and the existing-quest
// picker below stay for the one thing the time grid can't express - an
// all-day quest with no specific time.
export default function DayView({ cell, todayKey, onOpenQuest, onCreateRange, onReschedule, onAddQuest, availableQuests, onAssignQuest }: DayViewProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-white">{cell.date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <button type="button" onClick={onAddQuest} className="rounded-lg border border-purple-400/50 bg-purple-500/15 px-3 py-1.5 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/25">
          + New Quest
        </button>
      </div>

      <CalendarTimeGrid days={[cell]} todayKey={todayKey} onOpenQuest={onOpenQuest} onCreateRange={onCreateRange} onReschedule={onReschedule} />

      <AssignExistingQuestPicker availableQuests={availableQuests} onAssign={onAssignQuest} />
    </div>
  );
}
