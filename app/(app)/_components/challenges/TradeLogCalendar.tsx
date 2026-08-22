"use client";

import { useMemo, useState } from "react";
import { getLocalDayKey } from "../../_lib/local-day";
import { getTradesCalendarData, getTradesLoggedForDay } from "../../_lib/engines/trading-engine";
import type { TradeLogEntry } from "../../_lib/types/trade-log";

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

function groupByDay(entries: ReadonlyArray<TradeLogEntry>): Map<string, TradeLogEntry[]> {
  const byDay = new Map<string, TradeLogEntry[]>();

  entries.forEach((entry) => {
    const existing = byDay.get(entry.date);

    if (existing) {
      existing.push(entry);
    } else {
      byDay.set(entry.date, [entry]);
    }
  });

  return byDay;
}

type TradeLogCalendarProps = Readonly<{
  entries: ReadonlyArray<TradeLogEntry>;
  target?: number;
  onUpdateEntry: (id: string, count: number) => void;
  onDeleteEntry: (id: string) => void;
}>;

export default function TradeLogCalendar({ entries, target, onUpdateEntry, onDeleteEntry }: TradeLogCalendarProps) {
  const calendarData = useMemo(() => getTradesCalendarData(entries), [entries]);
  const entriesByDay = useMemo(() => groupByDay(entries), [entries]);
  const [monthCursor, setMonthCursor] = useState(() => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const weeks = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);
  const todayKey = getLocalDayKey();
  const monthLabel = monthCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const selectedCount = selectedDayKey ? getTradesLoggedForDay(entries, selectedDayKey) : 0;
  const selectedDayEntries = selectedDayKey ? entriesByDay.get(selectedDayKey) ?? [] : [];

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
        <button type="button" onClick={() => goToMonth(-1)} aria-label="Previous month" className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-emerald-400/60 hover:text-white">
          ←
        </button>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-white">{monthLabel}</p>
        <button type="button" onClick={() => goToMonth(1)} aria-label="Next month" className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-emerald-400/60 hover:text-white">
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
          const count = calendarData.get(day.dayKey) ?? 0;
          const hasEntries = count > 0;
          const metTarget = target !== undefined && count >= target;
          const isToday = day.dayKey === todayKey;
          const isSelected = day.dayKey === selectedDayKey;

          return (
            <button
              key={day.dayKey}
              type="button"
              onClick={() => setSelectedDayKey(hasEntries ? (isSelected ? null : day.dayKey) : null)}
              disabled={!hasEntries}
              className={
                "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-xs transition " +
                (isSelected
                  ? "border-emerald-300/80 bg-emerald-400/15 text-white"
                  : hasEntries
                    ? metTarget
                      ? "border-emerald-500/50 bg-emerald-500/10 text-white hover:border-emerald-400/70"
                      : "border-amber-500/40 bg-amber-500/10 text-white hover:border-amber-400/60"
                    : "border-transparent bg-slate-950/40 text-slate-600") +
                (day.inCurrentMonth ? "" : " opacity-35") +
                (isToday ? " ring-1 ring-purple-400/60" : "")
              }
            >
              <span>{day.date.getDate()}</span>
              {hasEntries ? <span className="text-[10px] font-bold">{count}</span> : null}
            </button>
          );
        })}
      </div>

      {selectedDayKey ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-sm font-semibold text-slate-400">{new Date(`${selectedDayKey}T00:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</p>
          <p className="mt-1 text-2xl font-black text-white">
            {selectedCount} trade{selectedCount === 1 ? "" : "s"} logged
          </p>
          <div className="mt-4 space-y-2">
            {selectedDayEntries.map((entry) => (
              <div key={entry.id} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={entry.count}
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    if (!Number.isNaN(parsed) && parsed >= 0) {
                      onUpdateEntry(entry.id, parsed);
                    }
                  }}
                  className="w-20 rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1.5 text-sm text-white outline-none transition focus:border-emerald-400"
                />
                <span className="text-xs text-slate-500">trades</span>
                <button
                  type="button"
                  onClick={() => onDeleteEntry(entry.id)}
                  aria-label="Delete entry"
                  className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-rose-300 transition hover:bg-rose-500/10"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
