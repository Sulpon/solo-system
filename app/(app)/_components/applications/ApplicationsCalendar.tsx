"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getLocalDayKey } from "../../_lib/local-day";
import { getApplicationsCalendarData } from "../../_lib/engines/career-hub-engine";
import type { VacancyEntry } from "../../_lib/types/vacancy";

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

type ApplicationsCalendarProps = Readonly<{
  vacancies: ReadonlyArray<VacancyEntry>;
  companyNames: ReadonlyMap<string, string>;
}>;

export default function ApplicationsCalendar({ vacancies, companyNames }: ApplicationsCalendarProps) {
  const calendarData = useMemo(() => getApplicationsCalendarData(vacancies), [vacancies]);
  const [monthCursor, setMonthCursor] = useState(() => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const weeks = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);
  const maxCount = Math.max(...Array.from(calendarData.values()).map((items) => items.length), 1);
  const todayKey = getLocalDayKey();
  const monthLabel = monthCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const selectedVacancies = selectedDayKey ? calendarData.get(selectedDayKey) ?? [] : [];

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
        <button type="button" onClick={() => goToMonth(-1)} aria-label="Previous month" className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-purple-400/60 hover:text-white">
          ←
        </button>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-white">{monthLabel}</p>
        <button type="button" onClick={() => goToMonth(1)} aria-label="Next month" className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-purple-400/60 hover:text-white">
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
          const dayVacancies = calendarData.get(day.dayKey) ?? [];
          const hasApplications = dayVacancies.length > 0;
          const isToday = day.dayKey === todayKey;
          const isSelected = day.dayKey === selectedDayKey;
          const intensity = hasApplications ? Math.min(1, dayVacancies.length / maxCount) : 0;

          return (
            <button
              key={day.dayKey}
              type="button"
              onClick={() => setSelectedDayKey(hasApplications ? (isSelected ? null : day.dayKey) : null)}
              disabled={!hasApplications}
              style={hasApplications ? { backgroundColor: `rgba(168, 85, 247, ${0.12 + intensity * 0.5})` } : undefined}
              className={
                "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-xs transition " +
                (isSelected
                  ? "border-purple-300/80 text-white"
                  : hasApplications
                    ? "border-slate-700 text-white hover:border-purple-400/50"
                    : "border-transparent bg-slate-950/40 text-slate-600") +
                (day.inCurrentMonth ? "" : " opacity-35") +
                (isToday ? " ring-1 ring-cyan-400/60" : "")
              }
            >
              <span>{day.date.getDate()}</span>
              {hasApplications ? <span className="text-[10px] font-bold">{dayVacancies.length}</span> : null}
            </button>
          );
        })}
      </div>

      {selectedDayKey && selectedVacancies.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-400">{new Date(`${selectedDayKey}T00:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</p>
          {selectedVacancies.map((vacancy) => (
            <Link
              key={vacancy.id}
              href={`/career-hub/companies/${vacancy.companyId}/vacancies/${vacancy.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 transition hover:border-purple-400/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{vacancy.positionName || "Untitled Position"}</p>
                <p className="mt-0.5 text-xs text-slate-500">{companyNames.get(vacancy.companyId) ?? "Unknown Company"}</p>
              </div>
              <span className="shrink-0 rounded-lg border border-slate-700 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{vacancy.status}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
