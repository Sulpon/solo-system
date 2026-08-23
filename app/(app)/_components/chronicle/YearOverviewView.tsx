"use client";

import { getYearOverview } from "../../_lib/engines/chronicle-engine";
import type { ChronicleContext } from "../../_lib/engines/chronicle-engine";

type YearOverviewViewProps = Readonly<{
  year: number;
  context: ChronicleContext;
  onSelectYear: (year: number) => void;
  onSelectDate: (date: string) => void;
}>;

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const INTENSITY_CLASSES = ["bg-slate-900", "bg-emerald-900/60", "bg-emerald-700/70", "bg-emerald-500/80", "bg-emerald-400"];

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
    </div>
  );
}

export default function YearOverviewView({ year, context, onSelectYear, onSelectDate }: YearOverviewViewProps) {
  const overview = getYearOverview(year, context);
  const currentYear = new Date().getFullYear();

  const cellsByMonth: (typeof overview.heatmap)[] = MONTH_LABELS.map((_, monthIndex) =>
    overview.heatmap.filter((cell) => new Date(cell.date + "T00:00:00").getMonth() === monthIndex),
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-purple-500/25 bg-slate-950/55 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => onSelectYear(year - 1)} aria-label="Previous year" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-purple-400/60 hover:text-white">
              ‹
            </button>
            <h2 className="text-lg font-black text-white">{year}</h2>
            <button type="button" onClick={() => onSelectYear(year + 1)} disabled={year >= currentYear} aria-label="Next year" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-purple-400/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
              ›
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Less</span>
            {INTENSITY_CLASSES.map((cls, index) => (
              <span key={index} className={`h-2.5 w-2.5 rounded-sm ${cls}`} />
            ))}
            <span>More</span>
          </div>
        </div>

        <div className="mt-5 space-y-1.5">
          {MONTH_LABELS.map((label, monthIndex) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-8 shrink-0 text-[10px] font-semibold uppercase text-slate-500">{label}</span>
              <div className="flex flex-1 flex-wrap gap-[3px]">
                {cellsByMonth[monthIndex].map((cell) => (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => onSelectDate(cell.date)}
                    title={`${cell.date}: +${cell.xpEarned} XP`}
                    className={`h-3 w-3 rounded-sm transition hover:ring-1 hover:ring-purple-300 ${INTENSITY_CLASSES[cell.intensity]}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-purple-500/25 bg-slate-950/55 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">Year in Numbers</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <StatTile label="Productive Days" value={overview.productiveDays.toLocaleString()} />
            <StatTile label="Workouts" value={overview.totalWorkouts.toLocaleString()} />
            <StatTile label="Quests Completed" value={overview.totalQuestsCompleted.toLocaleString()} />
            <StatTile label="XP Earned" value={overview.totalXpEarned.toLocaleString()} />
            <StatTile label="Avg Completion" value={`${overview.averageCompletionPercent}%`} />
            {overview.mostActiveMonth ? <StatTile label="Most Active Month" value={MONTH_LABELS[overview.mostActiveMonth.month]} /> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-purple-500/25 bg-slate-950/55 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">Major Milestones</p>
          {overview.majorMilestones.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nothing major recorded yet this year.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {overview.majorMilestones.map((milestone) => (
                <li key={milestone.id}>
                  <button type="button" onClick={() => onSelectDate(milestone.date)} className="flex w-full items-start justify-between gap-3 text-left text-sm hover:text-white">
                    <span className="text-slate-300">{milestone.title}</span>
                    <span className="shrink-0 text-xs text-slate-500">{milestone.date}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {overview.bestDay || overview.bestStreak ? (
        <div className="grid gap-4 md:grid-cols-2">
          {overview.bestDay ? (
            <div className="rounded-2xl border border-purple-500/25 bg-slate-950/55 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">Most Productive Day</p>
              <button type="button" onClick={() => onSelectDate(overview.bestDay!.date)} className="mt-2 block text-left hover:text-white">
                <p className="text-lg font-bold text-white">{overview.bestDay.date}</p>
                <p className="text-sm text-emerald-300">+{overview.bestDay.xpEarned.toLocaleString()} XP</p>
              </button>
            </div>
          ) : null}
          {overview.bestStreak ? (
            <div className="rounded-2xl border border-purple-500/25 bg-slate-950/55 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">Best Streak</p>
              <p className="mt-2 text-lg font-bold text-white">{overview.bestStreak.questTitle}</p>
              <p className="text-sm text-orange-300">
                {overview.bestStreak.days} days · {overview.bestStreak.startDate} – {overview.bestStreak.endDate}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
