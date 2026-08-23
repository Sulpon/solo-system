"use client";

import { getHabitMatrixForMonth } from "../../_lib/engines/chronicle-engine";
import { getLocalDayKey } from "../../_lib/local-day";
import type { ChronicleContext, HabitCellState } from "../../_lib/engines/chronicle-engine";

type HabitMatrixViewProps = Readonly<{
  year: number;
  month: number;
  context: ChronicleContext;
  onSelectMonth: (year: number, month: number) => void;
  onSelectDate: (date: string) => void;
}>;

const MONTH_LABELS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function HabitCell({ state }: { state: HabitCellState }) {
  if (state === "challenge-completed") {
    return (
      <span className="mx-auto flex h-5 w-5 items-center justify-center rounded-full border-2 border-emerald-300 bg-emerald-400/25 text-emerald-100 shadow-[0_0_8px_rgba(52,211,153,0.55)]">
        <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3">
          <path d="M4 10.5 8 14.5 16 6" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  if (state === "completed") {
    return (
      <span className="mx-auto flex h-5 w-5 items-center justify-center rounded-full text-emerald-400">
        <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
          <path d="M4 10.5 8 14.5 16 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  if (state === "missed") {
    return (
      <span className="mx-auto flex h-5 w-5 items-center justify-center text-rose-400">
        <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3">
          <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </span>
    );
  }

  return <span className="mx-auto flex h-5 w-5 items-center justify-center text-slate-700">·</span>;
}

export default function HabitMatrixView({ year, month, context, onSelectMonth, onSelectDate }: HabitMatrixViewProps) {
  const matrix = getHabitMatrixForMonth(context.quests, context.completions, year, month);
  const todayKey = getLocalDayKey();

  function goToMonth(deltaMonths: number) {
    const next = new Date(year, month + deltaMonths, 1);
    onSelectMonth(next.getFullYear(), next.getMonth());
  }

  return (
    <div className="rounded-2xl border border-purple-500/25 bg-slate-950/55 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => goToMonth(-1)} aria-label="Previous month" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-purple-400/60 hover:text-white">
            ‹
          </button>
          <h2 className="text-lg font-black text-white">
            {MONTH_LABELS[month]} {year}
          </h2>
          <button type="button" onClick={() => goToMonth(1)} aria-label="Next month" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-purple-400/60 hover:text-white">
            ›
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            const now = new Date();
            onSelectMonth(now.getFullYear(), now.getMonth());
          }}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-purple-400/60 hover:text-white"
        >
          Today
        </button>
      </div>

      {matrix.rows.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No daily quests to show yet.</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-slate-950/95 px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">Habit</th>
                {matrix.dayNumbers.map((day) => {
                  const dateKey = getLocalDayKey(new Date(year, month, day));
                  const isToday = dateKey === todayKey;
                  return (
                    <th key={day} className={"px-1 py-1 text-center font-semibold " + (isToday ? "text-purple-300" : "text-slate-600")}>
                      <button type="button" onClick={() => onSelectDate(dateKey)} className="w-full hover:text-white">
                        {day}
                      </button>
                    </th>
                  );
                })}
                <th className="px-2 py-1 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">Rate</th>
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((row) => (
                <tr key={row.questId} className="border-t border-slate-900">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-slate-950/95 px-2 py-1.5 text-left text-slate-300">{row.title}</td>
                  {row.cells.map((state, index) => (
                    <td key={index} className="px-1 py-1.5 text-center">
                      <HabitCell state={state} />
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-right font-semibold text-slate-300">{row.completionRatePercent === null ? "—" : `${row.completionRatePercent}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-900 pt-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <HabitCell state="completed" /> Done
        </span>
        <span className="flex items-center gap-1.5">
          <HabitCell state="challenge-completed" /> Challenge completed
        </span>
        <span className="flex items-center gap-1.5">
          <HabitCell state="missed" /> Missed
        </span>
        <span className="flex items-center gap-1.5">
          <HabitCell state="no-data" /> No data
        </span>
      </div>
    </div>
  );
}
