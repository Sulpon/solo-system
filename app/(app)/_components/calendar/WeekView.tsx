"use client";

import type { CalendarDayCell } from "../../_lib/engines/quest-calendar-engine";
import QuestChip from "./QuestChip";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type WeekViewProps = Readonly<{
  days: ReadonlyArray<CalendarDayCell>;
  todayKey: string;
  selectedDayKey: string;
  onSelectDate: (dayKey: string) => void;
  onOpenQuest: (questId: string) => void;
}>;

export default function WeekView({ days, todayKey, selectedDayKey, onSelectDate, onOpenQuest }: WeekViewProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {days.map((cell, index) => {
        const isToday = cell.dayKey === todayKey;
        const isSelected = cell.dayKey === selectedDayKey;
        // Real completion timestamps carry a genuine time; not-yet-completed
        // or missed quests have no time on Quest at all, so they stay in
        // "All Day" rather than a fabricated slot.
        const timed = cell.items.filter((item) => item.completion).sort((a, b) => (a.completion!.completedAt < b.completion!.completedAt ? -1 : 1));
        const allDay = cell.items.filter((item) => !item.completion);

        return (
          <div
            key={cell.dayKey}
            role="button"
            tabIndex={0}
            onClick={() => onSelectDate(cell.dayKey)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onSelectDate(cell.dayKey);
            }}
            className={
              "flex min-h-[16rem] cursor-pointer flex-col gap-2 rounded-xl border p-2.5 " +
              (isSelected ? "border-purple-400 bg-purple-500/10" : isToday ? "border-cyan-400/60 bg-slate-950/60" : "border-slate-800 bg-slate-950/40 hover:border-slate-600")
            }
          >
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">{WEEKDAY_LABELS[index]}</p>
              <p className={"text-sm font-bold " + (isToday ? "text-cyan-300" : "text-white")}>{cell.date.getDate()}</p>
            </div>

            {allDay.length > 0 ? (
              <div className="space-y-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-600">All Day</p>
                {allDay.map((item) => (
                  <QuestChip key={item.quest.id} item={item} onClick={() => onOpenQuest(item.quest.id)} compact />
                ))}
              </div>
            ) : null}

            {timed.length > 0 ? (
              <div className="space-y-1 border-t border-slate-800 pt-1.5">
                {timed.map((item) => (
                  <QuestChip key={item.quest.id} item={item} onClick={() => onOpenQuest(item.quest.id)} compact />
                ))}
              </div>
            ) : null}

            {allDay.length === 0 && timed.length === 0 ? <p className="text-center text-[10px] text-slate-600">—</p> : null}
          </div>
        );
      })}
    </div>
  );
}
