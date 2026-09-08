"use client";

import type { CalendarDayCell } from "../../_lib/engines/quest-calendar-engine";
import QuestChip from "./QuestChip";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const MAX_VISIBLE_ITEMS = 3;

type MonthViewProps = Readonly<{
  weeks: ReadonlyArray<ReadonlyArray<CalendarDayCell>>;
  todayKey: string;
  selectedDayKey: string;
  onSelectDate: (dayKey: string) => void;
  onOpenQuest: (questId: string) => void;
}>;

export default function MonthView({ weeks, todayKey, selectedDayKey, onSelectDate, onOpenQuest }: MonthViewProps) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {weeks.flat().map((cell) => {
          const isToday = cell.dayKey === todayKey;
          const isSelected = cell.dayKey === selectedDayKey;
          const visibleItems = cell.items.slice(0, MAX_VISIBLE_ITEMS);
          const hiddenCount = cell.items.length - visibleItems.length;

          return (
            // A day cell containing quest chips can't be a real <button> -
            // each chip is its own button (nested buttons are invalid HTML
            // and break click targeting). QuestChip stops its own click from
            // bubbling here, so this only fires for clicks on empty cell
            // space.
            <div
              key={cell.dayKey}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDate(cell.dayKey)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onSelectDate(cell.dayKey);
              }}
              className={
                "flex min-h-[6.5rem] cursor-pointer flex-col items-stretch gap-1 rounded-lg border p-1.5 text-left align-top transition " +
                (isSelected ? "border-purple-400 bg-purple-500/10" : isToday ? "border-cyan-400/60 bg-slate-950/60" : "border-slate-800 bg-slate-950/40 hover:border-slate-600") +
                (cell.inCurrentPeriod ? "" : " opacity-40")
              }
            >
              <span className={"text-xs font-semibold " + (isToday ? "text-cyan-300" : "text-slate-300")}>{cell.date.getDate()}</span>
              <div className="flex flex-1 flex-col gap-1">
                {visibleItems.map((item) => (
                  <QuestChip key={item.quest.id} item={item} onClick={() => onOpenQuest(item.quest.id)} compact iconOnlyBelowSm />
                ))}
                {hiddenCount > 0 ? <span className="px-1 text-[10px] font-semibold text-slate-500">+{hiddenCount} more</span> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
