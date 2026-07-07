"use client";

import DailyProgressRing from "./DailyProgressRing";

type CommandCenterHeaderProps = Readonly<{
  currentDate: string;
  dailySuccessPercent: number;
  subtitle: string;
  alreadyReviewed: boolean;
  onFinishDay: () => void;
  onEnterEditMode: () => void;
}>;

export default function CommandCenterHeader({
  currentDate,
  dailySuccessPercent,
  subtitle,
  alreadyReviewed,
  onFinishDay,
  onEnterEditMode,
}: CommandCenterHeaderProps) {
  return (
    <header className="rounded-2xl border border-purple-500/20 bg-slate-950/45 p-5 shadow-[0_0_30px_rgba(88,28,135,0.12)] backdrop-blur-xl">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Daily Overview</p>
          <h1 className="mt-1 text-3xl font-black text-white">Today</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">{subtitle}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">{currentDate}</p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <DailyProgressRing value={dailySuccessPercent} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
            >
              Plan My Day
            </button>
            <button
              type="button"
              onClick={onFinishDay}
              className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
            >
              {alreadyReviewed ? "Review Again" : "End Day"}
            </button>
            <button
              type="button"
              onClick={onEnterEditMode}
              className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-purple-400/60 hover:text-white"
            >
              Customize
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
