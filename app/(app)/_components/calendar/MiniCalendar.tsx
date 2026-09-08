"use client";

type MiniCalendarCell = Readonly<{ date: Date; dayKey: string; inCurrentPeriod: boolean; hasItems: boolean }>;

type MiniCalendarProps = Readonly<{
  weeks: ReadonlyArray<ReadonlyArray<MiniCalendarCell>>;
  monthLabel: string;
  todayKey: string;
  selectedDayKey: string;
  onSelectDate: (dayKey: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}>;

const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"] as const;

export default function MiniCalendar({ weeks, monthLabel, todayKey, selectedDayKey, onSelectDate, onPreviousMonth, onNextMonth }: MiniCalendarProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={onPreviousMonth} aria-label="Previous month" className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:text-white">
          ←
        </button>
        <p className="text-xs font-semibold text-white">{monthLabel}</p>
        <button type="button" onClick={onNextMonth} aria-label="Next month" className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:text-white">
          →
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center text-[9px] text-slate-600">
        {WEEKDAY_INITIALS.map((initial, index) => (
          <span key={`${initial}-${index}`}>{initial}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-0.5">
        {weeks.flat().map((cell) => {
          const isToday = cell.dayKey === todayKey;
          const isSelected = cell.dayKey === selectedDayKey;
          return (
            <button
              key={cell.dayKey}
              type="button"
              onClick={() => onSelectDate(cell.dayKey)}
              className={
                "relative flex aspect-square items-center justify-center rounded text-[10px] transition " +
                (isSelected ? "bg-purple-500/30 text-white" : isToday ? "text-cyan-300" : "text-slate-400 hover:bg-slate-800") +
                (cell.inCurrentPeriod ? "" : " opacity-30")
              }
            >
              {cell.date.getDate()}
              {cell.hasItems ? <span className="absolute bottom-0.5 h-0.5 w-0.5 rounded-full bg-purple-400" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
