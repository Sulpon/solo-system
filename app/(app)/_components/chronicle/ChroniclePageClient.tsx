"use client";

import { useState } from "react";
import Card from "../Card";
import { useChronicleContext } from "../../_lib/hooks/useChronicleContext";
import { getLocalDayKey } from "../../_lib/local-day";
import HabitMatrixView from "./HabitMatrixView";
import DayView from "./DayView";
import TimelineView from "./TimelineView";
import YearOverviewView from "./YearOverviewView";
import StatsInsightsView from "./StatsInsightsView";

type ChronicleViewMode = "day" | "month" | "year" | "timeline" | "stats";

const VIEW_TABS: ReadonlyArray<{ mode: ChronicleViewMode; label: string }> = [
  { mode: "day", label: "Day" },
  { mode: "month", label: "Month" },
  { mode: "year", label: "Year" },
  { mode: "timeline", label: "Timeline" },
  { mode: "stats", label: "Stats" },
];

export default function ChroniclePageClient() {
  const { isReady, context, upsertEntryForDate, getEntryForDate } = useChronicleContext();
  const today = new Date();
  const [viewMode, setViewMode] = useState<ChronicleViewMode>("month");
  const [selectedDate, setSelectedDate] = useState(() => getLocalDayKey(today));
  const [selectedMonth, setSelectedMonth] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }));
  const [selectedYear, setSelectedYear] = useState(() => today.getFullYear());

  function goToDate(date: string) {
    setSelectedDate(date);
    setViewMode("day");
  }

  if (!isReady) {
    return (
      <Card className="p-5">
        <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4 text-sm text-slate-400">Loading Chronicle...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-purple-500/25 bg-[radial-gradient(circle_at_12%_0%,rgba(126,34,206,0.18),transparent_24%),linear-gradient(135deg,rgba(15,23,42,0.7),rgba(2,6,23,0.9))] p-5">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/60 to-transparent" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Chronicle</p>
            <h1 className="mt-1 text-2xl font-black text-white">The record of your progress</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {VIEW_TABS.map((tab) => (
              <button
                key={tab.mode}
                type="button"
                onClick={() => setViewMode(tab.mode)}
                className={
                  "rounded-xl border px-4 py-2 text-sm font-semibold transition " +
                  (viewMode === tab.mode ? "border-purple-400/60 bg-purple-500/20 text-white shadow-[0_0_18px_rgba(168,85,247,0.2)]" : "border-slate-700 bg-slate-950/50 text-slate-400 hover:border-purple-400/40 hover:text-white")
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {viewMode === "day" ? (
        <DayView
          date={selectedDate}
          context={context}
          journalEntry={getEntryForDate(selectedDate)}
          onSelectDate={setSelectedDate}
          onSaveEntry={(date, draft) => upsertEntryForDate(date, draft)}
        />
      ) : null}

      {viewMode === "month" ? (
        <HabitMatrixView
          year={selectedMonth.year}
          month={selectedMonth.month}
          context={context}
          onSelectMonth={(year, month) => setSelectedMonth({ year, month })}
          onSelectDate={goToDate}
        />
      ) : null}

      {viewMode === "year" ? <YearOverviewView year={selectedYear} context={context} onSelectYear={setSelectedYear} onSelectDate={goToDate} /> : null}

      {viewMode === "timeline" ? <TimelineView context={context} onSelectDate={goToDate} /> : null}

      {viewMode === "stats" ? <StatsInsightsView context={context} /> : null}
    </div>
  );
}
