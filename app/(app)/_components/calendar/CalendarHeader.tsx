"use client";

export type CalendarView = "month" | "week" | "day";

type CalendarHeaderProps = Readonly<{
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  periodLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}>;

export default function CalendarHeader({ view, onViewChange, periodLabel, onPrevious, onNext, onToday }: CalendarHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Calendar</p>
        <h1 className="mt-1 text-2xl font-black text-white">{periodLabel}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onToday} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-purple-400/60 hover:text-white">
          Today
        </button>
        <button type="button" onClick={onPrevious} aria-label="Previous period" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-purple-400/60 hover:text-white">
          ←
        </button>
        <button type="button" onClick={onNext} aria-label="Next period" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-purple-400/60 hover:text-white">
          →
        </button>

        <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-950/60 p-1">
          {(["month", "week", "day"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onViewChange(option)}
              className={"rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition " + (view === option ? "bg-purple-500/20 text-white" : "text-slate-500 hover:text-slate-300")}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
