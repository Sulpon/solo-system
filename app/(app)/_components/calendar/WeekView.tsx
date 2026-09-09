"use client";

import type { CalendarDayCell, QuestSchedulePatch } from "../../_lib/engines/quest-calendar-engine";
import CalendarTimeGrid from "./CalendarTimeGrid";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type WeekViewProps = Readonly<{
  days: ReadonlyArray<CalendarDayCell>;
  todayKey: string;
  selectedDayKey: string;
  onSelectDate: (dayKey: string) => void;
  onOpenQuest: (questId: string) => void;
  onCreateRange: (dayKey: string, startTime: string, endTime: string) => void;
  onReschedule: (questId: string, patch: QuestSchedulePatch) => void;
}>;

// The primary scheduling surface (see CalendarTimeGrid for the actual grid,
// drag-to-create/move/resize, current-time line, etc. - identical machinery
// reused between Week and Day, only the day count differs here).
export default function WeekView({ days, todayKey, selectedDayKey, onSelectDate, onOpenQuest, onCreateRange, onReschedule }: WeekViewProps) {
  return (
    <CalendarTimeGrid
      days={days}
      dayLabels={WEEKDAY_LABELS}
      todayKey={todayKey}
      selectedDayKey={selectedDayKey}
      onSelectDate={onSelectDate}
      onOpenQuest={onOpenQuest}
      onCreateRange={onCreateRange}
      onReschedule={onReschedule}
    />
  );
}
