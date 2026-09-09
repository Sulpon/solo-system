"use client";

import { getQuestIconKey } from "../quests/QuestIcon";
import QuestIcon from "../quests/QuestIcon";
import type { CalendarDayCell, CalendarQuestItem } from "../../_lib/engines/quest-calendar-engine";
import type { Quest } from "../../_lib/types/quest";
import { formatTimeLabel } from "../../_lib/calendar-time";
import MiniCalendar from "./MiniCalendar";
import AssignExistingQuestPicker from "./AssignExistingQuestPicker";

type MiniCalendarCell = Readonly<{ date: Date; dayKey: string; inCurrentPeriod: boolean; hasItems: boolean }>;

type DayPanelProps = Readonly<{
  miniWeeks: ReadonlyArray<ReadonlyArray<MiniCalendarCell>>;
  miniMonthLabel: string;
  todayKey: string;
  selectedDayKey: string;
  onSelectDate: (dayKey: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  selectedCell: CalendarDayCell;
  onToggleComplete: (item: CalendarQuestItem) => void;
  onOpenQuest: (questId: string) => void;
  onAddQuest: () => void;
  availableQuests: ReadonlyArray<Quest>;
  onAssignQuest: (questId: string) => void;
  onClearSchedule: (questId: string) => void;
}>;

export default function DayPanel({
  miniWeeks,
  miniMonthLabel,
  todayKey,
  selectedDayKey,
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
  selectedCell,
  onToggleComplete,
  onOpenQuest,
  onAddQuest,
  availableQuests,
  onAssignQuest,
  onClearSchedule,
}: DayPanelProps) {
  const dateLabel = selectedCell.date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-5 rounded-2xl border border-purple-500/20 bg-slate-950/70 p-4">
      <MiniCalendar
        weeks={miniWeeks}
        monthLabel={miniMonthLabel}
        todayKey={todayKey}
        selectedDayKey={selectedDayKey}
        onSelectDate={onSelectDate}
        onPreviousMonth={onPreviousMonth}
        onNextMonth={onNextMonth}
      />

      <div className="border-t border-slate-800 pt-4">
        <p className="text-sm font-bold text-white">{dateLabel}</p>
        <p className="text-xs text-slate-500">
          {selectedCell.items.length} quest{selectedCell.items.length === 1 ? "" : "s"}
        </p>

        <div className="mt-3 space-y-2">
          {selectedCell.items.length === 0 ? (
            <p className="text-xs text-slate-500">Nothing scheduled.</p>
          ) : (
            selectedCell.items.map((item) => {
              const iconKey = getQuestIconKey(item.quest.title);
              const time = item.startTime
                ? formatTimeLabel(item.startTime)
                : item.completion
                  ? new Date(item.completion.completedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
                  : null;
              const canClearSchedule = !item.isRecurring && item.status !== "completed" && item.quest.scheduledDate === selectedCell.dayKey;

              return (
                <div key={item.quest.id} className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-2">
                  <button
                    type="button"
                    onClick={() => onToggleComplete(item)}
                    aria-label={item.status === "completed" ? "Undo completion" : "Mark complete"}
                    className={
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition " +
                      (item.status === "completed" ? "border-emerald-400 bg-emerald-500/20 text-emerald-300" : "border-slate-600 text-transparent hover:border-purple-400")
                    }
                  >
                    {item.status === "completed" ? "✓" : ""}
                  </button>
                  <button type="button" onClick={() => onOpenQuest(item.quest.id)} className="min-w-0 flex-1 text-left">
                    <span className="flex items-center gap-1.5">
                      <QuestIcon iconKey={iconKey} className="h-3 w-3 shrink-0 text-slate-400" />
                      <span className={"truncate text-sm font-semibold " + (item.status === "completed" ? "text-slate-400 line-through decoration-emerald-400/50" : item.status === "missed" ? "text-rose-300" : "text-white")}>
                        {item.quest.title}
                      </span>
                    </span>
                    {time ? <span className="mt-0.5 block text-[11px] text-slate-500">{time}</span> : null}
                  </button>
                  {canClearSchedule ? (
                    <button
                      type="button"
                      onClick={() => onClearSchedule(item.quest.id)}
                      aria-label="Remove from calendar"
                      title="Remove from this day"
                      className="mt-0.5 shrink-0 text-xs text-slate-600 transition hover:text-rose-300"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-3 space-y-2">
          <button type="button" onClick={onAddQuest} className="w-full rounded-lg border border-purple-400/50 bg-purple-500/15 px-3 py-2 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/25">
            + New Quest
          </button>
          <AssignExistingQuestPicker availableQuests={availableQuests} onAssign={onAssignQuest} />
        </div>
      </div>
    </div>
  );
}
