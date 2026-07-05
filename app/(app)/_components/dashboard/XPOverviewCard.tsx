"use client";

import Card from "../Card";
import type { getWeeklyXpSeries } from "./dashboard-overview.utils";

type XPOverviewCardProps = Readonly<{
  series: ReturnType<typeof getWeeklyXpSeries>;
}>;

export default function XPOverviewCard({ series }: XPOverviewCardProps) {
  const total = series.reduce((sum, bucket) => sum + bucket.value, 0);
  const average = Math.round(total / Math.max(1, series.length));
  const maxValue = Math.max(...series.map((bucket) => bucket.value), 1);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">XP Overview</p>
          <h2 className="mt-1 text-xl font-black text-white">Weekly output</h2>
        </div>
        <div className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">
          {total.toLocaleString()} XP total
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4">
        <svg viewBox="0 0 100 100" className="h-56 w-full" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="xp-area" x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(168,85,247,0.4)" />
              <stop offset="100%" stopColor="rgba(168,85,247,0.05)" />
            </linearGradient>
          </defs>
          <polyline
            points={series
              .map((bucket, index) => {
                const x = series.length === 1 ? 50 : (index / (series.length - 1)) * 100;
                const y = 100 - (bucket.value / maxValue) * 100;
                return `${x},${y}`;
              })
              .join(" ")}
            fill="none"
            className="stroke-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.35)]"
            strokeWidth="2.8"
            vectorEffect="non-scaling-stroke"
          />
          <polygon
            points={`0,100 ${series
              .map((bucket, index) => {
                const x = series.length === 1 ? 50 : (index / (series.length - 1)) * 100;
                const y = 100 - (bucket.value / maxValue) * 100;
                return `${x},${y}`;
              })
              .join(" ")} 100,100`}
            fill="url(#xp-area)"
          />
        </svg>

        <div className="mt-2 grid grid-cols-7 gap-2 text-center text-xs text-slate-500">
          {series.map((bucket) => (
            <div key={bucket.key} className="space-y-2">
              <p>{bucket.label}</p>
              <div className="h-16 rounded-lg border border-slate-800 bg-slate-950/70 p-1">
                <div
                  className="h-full rounded-md bg-gradient-to-t from-purple-500 to-cyan-300"
                  style={{ height: `${Math.max(6, (bucket.value / maxValue) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/45 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Daily average</p>
          <p className="mt-2 text-2xl font-black text-white">{average.toLocaleString()} XP</p>
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/45 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Best day</p>
          <p className="mt-2 text-2xl font-black text-white">
            {Math.max(...series.map((bucket) => bucket.value), 0).toLocaleString()} XP
          </p>
        </div>
      </div>
    </Card>
  );
}
