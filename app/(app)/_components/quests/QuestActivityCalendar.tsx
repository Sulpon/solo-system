"use client";

import { StatValue } from "../../_lib/widgets/catalog-helpers";
import type { QuestCalendarDay } from "../../_lib/engines/quest-calendar-engine";

type QuestActivityCalendarProps = Readonly<{
  weeks: ReadonlyArray<ReadonlyArray<QuestCalendarDay>>;
  currentStreak: number;
  bestStreak: number;
  completionPercent: Readonly<{ weekly: number; monthly: number; yearly: number }>;
}>;

const DAY_COLOR: Record<QuestCalendarDay["state"], string> = {
  completed: "rgba(168, 85, 247, 0.75)",
  missed: "rgba(15, 23, 42, 0.45)",
  future: "rgba(15, 23, 42, 0.2)",
};

function formatDayTitle(day: QuestCalendarDay) {
  const dateLabel = day.date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  if (day.state === "completed") {
    return `${dateLabel} — Completed`;
  }

  if (day.state === "missed") {
    return `${dateLabel} — Missed`;
  }

  return dateLabel;
}

export default function QuestActivityCalendar({ weeks, currentStreak, bestStreak, completionPercent }: QuestActivityCalendarProps) {
  return (
    <div className="space-y-5">
      <div className="overflow-x-auto pb-1">
        <div className="inline-grid grid-flow-col gap-[3px]">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-rows-7 gap-[3px]">
              {week.map((day) => (
                <div
                  key={day.dayKey}
                  title={formatDayTitle(day)}
                  className="h-[11px] w-[11px] rounded-[3px] border border-slate-800/60"
                  style={{ backgroundColor: DAY_COLOR[day.state] }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <StatValue label="Current Streak" value={currentStreak} />
        <StatValue label="Best Streak" value={bestStreak} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatValue label="Weekly" value={`${completionPercent.weekly}%`} />
        <StatValue label="Monthly" value={`${completionPercent.monthly}%`} />
        <StatValue label="Yearly" value={`${completionPercent.yearly}%`} />
      </div>
    </div>
  );
}
