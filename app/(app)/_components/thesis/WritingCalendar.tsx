"use client";

import { useMemo, useState } from "react";
import { getLocalDayKey } from "../../_lib/local-day";
import { getWritingCalendarData } from "../../_lib/engines/thesis-engine";
import type { WritingLogEntry } from "../../_lib/types/writing-log";

const WEEKDAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

type CalendarDay = Readonly<{ date: Date; dayKey: string; inCurrentMonth: boolean }>;

function buildMonthGrid(monthCursor: Date): CalendarDay[][] {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const mondayFirstOffset = (firstOfMonth.getDay() + 6) % 7;

  const gridStart = new Date(year, month, 1 - mondayFirstOffset);
  const weeks: CalendarDay[][] = [];
  const cursor = new Date(gridStart);

  for (let week = 0; week < 6; week += 1) {
    const days: CalendarDay[] = [];

    for (let day = 0; day < 7; day += 1) {
      days.push({ date: new Date(cursor), dayKey: getLocalDayKey(cursor), inCurrentMonth: cursor.getMonth() === month });
      cursor.setDate(cursor.getDate() + 1);
    }

    weeks.push(days);
  }

  return weeks;
}

type WritingCalendarProps = Readonly<{ entries: ReadonlyArray<WritingLogEntry> }>;

export default function WritingCalendar({ entries }: WritingCalendarProps) {
  const calendarData = useMemo(() => getWritingCalendarData(entries), [entries]);
  const [monthCursor, setMonthCursor] = useState(() => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const weeks = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);
  const maxPages = Math.max(...Array.from(calendarData.values()), 1);
  const todayKey = getLocalDayKey();
  const monthLabel = monthCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const selectedPages = selectedDayKey ? calendarData.get(selectedDayKey) ?? 0 : 0;

  function goToMonth(offset: number) {
    setMonthCursor((current) => {
      const next = new Date(current);
      next.setMonth(next.getMonth() + offset);
      return next;
    });
    setSelectedDayKey(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => goToMonth(-1)} aria-label="Previous month" className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-cyan-400/60 hover:text-white">
          ←
        </button>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-white">{monthLabel}</p>
        <button type="button" onClick={() => goToMonth(1)} aria-label="Next month" className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-cyan-400/60 hover:text-white">
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {weeks.flat().map((day) => {
          const pages = calendarData.get(day.dayKey) ?? 0;
          const hasPages = pages > 0;
          const isToday = day.dayKey === todayKey;
          const isSelected = day.dayKey === selectedDayKey;
          const intensity = hasPages ? Math.min(1, pages / maxPages) : 0;

          return (
            <button
              key={day.dayKey}
              type="button"
              onClick={() => setSelectedDayKey(hasPages ? (isSelected ? null : day.dayKey) : null)}
              disabled={!hasPages}
              style={hasPages ? { backgroundColor: `rgba(34, 211, 238, ${0.12 + intensity * 0.5})` } : undefined}
              className={
                "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-xs transition " +
                (isSelected
                  ? "border-cyan-300/80 text-white"
                  : hasPages
                    ? "border-slate-700 text-white hover:border-cyan-400/50"
                    : "border-transparent bg-slate-950/40 text-slate-600") +
                (day.inCurrentMonth ? "" : " opacity-35") +
                (isToday ? " ring-1 ring-purple-400/60" : "")
              }
            >
              <span>{day.date.getDate()}</span>
              {hasPages ? <span className="text-[10px] font-bold">{pages}</span> : null}
            </button>
          );
        })}
      </div>

      {selectedDayKey ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-sm font-semibold text-slate-400">{new Date(`${selectedDayKey}T00:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</p>
          <p className="mt-1 text-2xl font-black text-white">
            {selectedPages} page{selectedPages === 1 ? "" : "s"} written
          </p>
        </div>
      ) : null}
    </div>
  );
}
