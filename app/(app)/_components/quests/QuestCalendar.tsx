"use client";

import { useMemo, useState } from "react";
import { buildQuestCalendarMonth, buildQuestCalendarWeek, getQuestDayDetail } from "../../_lib/engines/quest-calendar-engine";
import type { QuestCalendarDayStatus } from "../../_lib/engines/quest-calendar-engine";
import { getLocalDayKey, parseLocalDayKey } from "../../_lib/local-day";
import type { Quest, QuestCompletion } from "../../_lib/types/quest";

type CalendarView = "month" | "week" | "day";

type QuestCalendarProps = Readonly<{
  quest: Quest;
  completions: ReadonlyArray<QuestCompletion>;
}>;

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const STATUS_STYLE: Record<QuestCalendarDayStatus, string> = {
  completed: "bg-emerald-500/25 border-emerald-400/60 text-emerald-100",
  missed: "bg-rose-500/15 border-rose-400/50 text-rose-200",
  "not-scheduled": "border-slate-800 text-slate-600",
  future: "border-slate-800 text-slate-500",
};

const STATUS_DOT: Record<QuestCalendarDayStatus, string> = {
  completed: "bg-emerald-400",
  missed: "bg-rose-400",
  "not-scheduled": "bg-slate-700",
  future: "bg-slate-800",
};

function startOfWeekMonday(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

export default function QuestCalendar({ quest, completions }: QuestCalendarProps) {
  const [view, setView] = useState<CalendarView>("month");
  const [cursorDate, setCursorDate] = useState(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const todayKey = getLocalDayKey();

  const monthWeeks = useMemo(() => (view === "month" ? buildQuestCalendarMonth(quest, completions, cursorDate.getFullYear(), cursorDate.getMonth()) : []), [view, quest, completions, cursorDate]);
  const weekDays = useMemo(() => (view === "week" ? buildQuestCalendarWeek(quest, completions, cursorDate) : []), [view, quest, completions, cursorDate]);

  const effectiveSelectedKey = view === "day" ? getLocalDayKey(cursorDate) : selectedDayKey;
  const dayDetail = useMemo(() => (effectiveSelectedKey ? getQuestDayDetail(quest, completions, parseLocalDayKey(effectiveSelectedKey)) : null), [effectiveSelectedKey, quest, completions]);

  function goPrevious() {
    const next = new Date(cursorDate);
    if (view === "month") next.setMonth(next.getMonth() - 1);
    else if (view === "week") next.setDate(next.getDate() - 7);
    else next.setDate(next.getDate() - 1);
    setCursorDate(next);
  }

  function goNext() {
    const next = new Date(cursorDate);
    if (view === "month") next.setMonth(next.getMonth() + 1);
    else if (view === "week") next.setDate(next.getDate() + 7);
    else next.setDate(next.getDate() + 1);
    setCursorDate(next);
  }

  function goToday() {
    setCursorDate(new Date());
    setSelectedDayKey(null);
  }

  const periodLabel = useMemo(() => {
    if (view === "month") {
      return cursorDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    }
    if (view === "week") {
      const start = startOfWeekMonday(cursorDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return cursorDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }, [view, cursorDate]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={goPrevious} aria-label="Previous period" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-purple-400/60 hover:text-white">
            ←
          </button>
          <span className="min-w-[10rem] text-center text-sm font-bold text-white">{periodLabel}</span>
          <button type="button" onClick={goNext} aria-label="Next period" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-purple-400/60 hover:text-white">
            →
          </button>
          <button type="button" onClick={goToday} className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-purple-400/60 hover:text-white">
            Today
          </button>
        </div>

        <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-950/60 p-1">
          {(["month", "week", "day"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              className={"rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] transition " + (view === option ? "bg-purple-500/20 text-white" : "text-slate-500 hover:text-slate-300")}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {view === "month" ? (
        <div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="py-1">
                {label}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {monthWeeks.flat().map((cell) => (
              <button
                key={cell.dayKey}
                type="button"
                onClick={() => setSelectedDayKey(cell.dayKey)}
                className={
                  "relative aspect-square rounded-lg border text-xs font-semibold transition " +
                  STATUS_STYLE[cell.status] +
                  (cell.inCurrentPeriod ? "" : " opacity-30") +
                  (cell.dayKey === selectedDayKey ? " ring-2 ring-purple-400" : "") +
                  (cell.dayKey === todayKey ? " ring-1 ring-cyan-400" : "")
                }
              >
                {cell.date.getDate()}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {view === "week" ? (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((cell, index) => (
            <button
              key={cell.dayKey}
              type="button"
              onClick={() => setSelectedDayKey(cell.dayKey)}
              className={
                "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-semibold transition " +
                STATUS_STYLE[cell.status] +
                (cell.dayKey === selectedDayKey ? " ring-2 ring-purple-400" : "") +
                (cell.dayKey === todayKey ? " ring-1 ring-cyan-400" : "")
              }
            >
              <span className="text-[10px] uppercase tracking-[0.08em] text-slate-500">{WEEKDAY_LABELS[index]}</span>
              <span className="text-base">{cell.date.getDate()}</span>
            </button>
          ))}
        </div>
      ) : null}

      {view !== "day" ? (
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
          {(["completed", "missed", "not-scheduled"] as const).map((status) => (
            <span key={status} className="flex items-center gap-1.5">
              <span className={"h-2 w-2 rounded-full " + STATUS_DOT[status]} />
              {status === "completed" ? "Completed" : status === "missed" ? "Missed" : "Not scheduled"}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            Today
          </span>
        </div>
      ) : null}

      {dayDetail ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{parseLocalDayKey(effectiveSelectedKey as string).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</p>
          {dayDetail.status === "completed" && dayDetail.completion ? (
            <div className="mt-2 flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-300">✓ Completed</span>
              <span className="text-xs text-slate-400">{new Date(dayDetail.completion.completedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
              <span className="text-xs font-semibold text-purple-200">+{dayDetail.completion.xpAwarded} XP</span>
            </div>
          ) : dayDetail.status === "missed" ? (
            <p className="mt-2 text-sm font-semibold text-rose-300">✕ Missed</p>
          ) : dayDetail.status === "not-scheduled" ? (
            <p className="mt-2 text-sm text-slate-500">No quest scheduled</p>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Hasn&apos;t happened yet</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-500">Click a date to see what happened.</p>
      )}
    </div>
  );
}
