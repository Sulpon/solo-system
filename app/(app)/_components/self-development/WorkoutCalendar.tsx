"use client";

import { useMemo, useState } from "react";
import { getLocalDayKey } from "../../_lib/local-day";
import { getWorkoutCalendarData } from "../../_lib/engines/workout-engine";
import { formatFocusDuration } from "../focus/focus-format";
import SessionDetailModal from "../workouts/SessionDetailModal";
import type { WorkoutSession } from "../../_lib/types/workout";

const WEEKDAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// Small fixed palette, assigned to a workout type by a stable hash of its
// name - keeps calendar dots visually distinct without hardcoding a list of
// workout types (templates are entirely user-defined free text).
const TYPE_DOT_COLORS = ["bg-emerald-400", "bg-cyan-400", "bg-purple-400", "bg-amber-400", "bg-rose-400", "bg-sky-400"];

function colorForType(type: string) {
  let hash = 0;
  for (let index = 0; index < type.length; index += 1) {
    hash = (hash * 31 + type.charCodeAt(index)) >>> 0;
  }
  return TYPE_DOT_COLORS[hash % TYPE_DOT_COLORS.length];
}

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

type WorkoutCalendarProps = Readonly<{ sessions: ReadonlyArray<WorkoutSession> }>;

export default function WorkoutCalendar({ sessions }: WorkoutCalendarProps) {
  const calendarData = useMemo(() => getWorkoutCalendarData(sessions), [sessions]);
  const [monthCursor, setMonthCursor] = useState(() => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [detailSession, setDetailSession] = useState<WorkoutSession | null>(null);

  const weeks = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);
  const todayKey = getLocalDayKey();
  const monthLabel = monthCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const selectedDaySessions = selectedDayKey ? calendarData.get(selectedDayKey) ?? [] : [];

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
          const daySessions = calendarData.get(day.dayKey) ?? [];
          const hasWorkout = daySessions.length > 0;
          const isToday = day.dayKey === todayKey;
          const isSelected = day.dayKey === selectedDayKey;

          return (
            <button
              key={day.dayKey}
              type="button"
              onClick={() => setSelectedDayKey(hasWorkout ? (isSelected ? null : day.dayKey) : null)}
              disabled={!hasWorkout}
              className={
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border text-xs transition " +
                (isSelected
                  ? "border-emerald-400/70 bg-emerald-400/15 text-white"
                  : hasWorkout
                    ? "border-slate-700 bg-slate-950/60 text-white hover:border-emerald-400/50"
                    : "border-transparent text-slate-600") +
                (day.inCurrentMonth ? "" : " opacity-35") +
                (isToday ? " ring-1 ring-purple-400/60" : "")
              }
            >
              <span>{day.date.getDate()}</span>
              {hasWorkout ? (
                <span className="flex gap-0.5">
                  {daySessions.slice(0, 3).map((session) => (
                    <span key={session.id} className={"h-1.5 w-1.5 rounded-full " + colorForType(session.templateTitle?.trim() || "Freeform")} />
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {selectedDaySessions.length > 0 ? (
        <div className="space-y-2">
          {selectedDaySessions.map((session) => (
            <div key={session.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-400">{new Date(session.endedAt).toLocaleDateString(undefined, { month: "long", day: "numeric" })}</p>
                  <p className="mt-0.5 text-lg font-black text-white">{session.templateTitle ?? "Freeform Workout"}</p>
                </div>
                <button type="button" onClick={() => setDetailSession(session)} className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20">
                  View Details
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2 text-center">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Duration</p>
                  <p className="mt-1 text-sm font-bold text-white">{formatFocusDuration(session.durationSeconds)}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2 text-center">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Exercises</p>
                  <p className="mt-1 text-sm font-bold text-white">{session.exerciseLogs.length}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2 text-center">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Volume</p>
                  <p className="mt-1 text-sm font-bold text-white">{session.totalVolume.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2 text-center">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">PRs</p>
                  <p className="mt-1 text-sm font-bold text-white">{session.personalRecordsAchieved.length}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {detailSession ? <SessionDetailModal session={detailSession} onClose={() => setDetailSession(null)} /> : null}
    </div>
  );
}
