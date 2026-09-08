"use client";

import { formatDateRange, type QuarterRange } from "../../_lib/engines/planning-engine";

type QuarterSelectorProps = Readonly<{
  quarter: QuarterRange;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  isCurrentQuarter: boolean;
}>;

export default function QuarterSelector({ quarter, onPrevious, onNext, onToday, isCurrentQuarter }: QuarterSelectorProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-2xl font-black text-white">{quarter.label}</p>
        <p className="text-sm text-slate-400">{formatDateRange(quarter.start, quarter.end)}</p>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={onPrevious} aria-label="Previous quarter" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-purple-400/60 hover:text-white">
          ←
        </button>
        <button
          type="button"
          onClick={onToday}
          disabled={isCurrentQuarter}
          className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-purple-400/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Current Quarter
        </button>
        <button type="button" onClick={onNext} aria-label="Next quarter" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-purple-400/60 hover:text-white">
          →
        </button>
      </div>
    </div>
  );
}
