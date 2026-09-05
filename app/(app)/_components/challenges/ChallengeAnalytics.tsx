"use client";

import { getBooleanCompletionPercent, getMetricNumericStats } from "../../_lib/engines/challenge-mission-engine";
import type { Challenge, ChallengeEntry, ChallengeMetric } from "../../_lib/types/challenge";

function TrendBars({ trend }: Readonly<{ trend: ReadonlyArray<{ date: string; value: number }> }>) {
  const max = Math.max(...trend.map((point) => point.value), 1);

  return (
    <div className="mt-3 flex h-16 items-end gap-1">
      {trend.map((point) => (
        <div key={point.date} title={`${point.date}: ${point.value}`} className="flex-1 rounded-t bg-gradient-to-t from-purple-600 to-cyan-300" style={{ height: `${Math.max(6, (point.value / max) * 100)}%` }} />
      ))}
    </div>
  );
}

function MetricAnalyticsCard({ challenge, metric, entries }: Readonly<{ challenge: Challenge; metric: ChallengeMetric; entries: ReadonlyArray<ChallengeEntry> }>) {
  if (metric.type === "boolean") {
    const percent = getBooleanCompletionPercent(challenge, metric, entries);
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{metric.name}</p>
        <p className="mt-2 text-2xl font-black text-white">{percent !== null ? `${percent}%` : "—"}</p>
        <p className="mt-1 text-xs text-slate-500">completion rate</p>
      </div>
    );
  }

  if (metric.type === "number" || metric.type === "rating") {
    const stats = getMetricNumericStats(metric, entries);
    if (!stats) {
      return (
        <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{metric.name}</p>
          <p className="mt-2 text-sm text-slate-500">No entries yet</p>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{metric.name}</p>
          {metric.target !== undefined ? <span className="text-[10px] text-slate-600">target {metric.target}{metric.unit ? ` ${metric.unit}` : ""}</span> : null}
        </div>
        <div className="mt-2 flex items-baseline gap-4">
          <span className="text-2xl font-black text-white">{stats.average}</span>
          <span className="text-xs text-slate-500">avg{metric.unit ? ` ${metric.unit}` : ""}</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {stats.first?.value}
          {metric.unit ? ` ${metric.unit}` : ""} → {stats.latest?.value}
          {metric.unit ? ` ${metric.unit}` : ""} ({stats.first?.date} → {stats.latest?.date})
        </p>
        <TrendBars trend={stats.trend} />
      </div>
    );
  }

  if (metric.type === "text") {
    const count = entries.filter((entry) => entry.metricId === metric.id && typeof entry.value === "string" && entry.value.trim() !== "").length;
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{metric.name}</p>
        <p className="mt-2 text-2xl font-black text-white">{count}</p>
        <p className="mt-1 text-xs text-slate-500">days with notes</p>
      </div>
    );
  }

  // photo
  const count = entries.filter((entry) => entry.metricId === metric.id && entry.photoId).length;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{metric.name}</p>
      <p className="mt-2 text-2xl font-black text-white">{count}</p>
      <p className="mt-1 text-xs text-slate-500">photos logged</p>
    </div>
  );
}

type ChallengeAnalyticsProps = Readonly<{
  challenge: Challenge;
  metrics: ReadonlyArray<ChallengeMetric>;
  entries: ReadonlyArray<ChallengeEntry>;
}>;

export default function ChallengeAnalytics({ challenge, metrics, entries }: ChallengeAnalyticsProps) {
  if (metrics.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Analytics</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <MetricAnalyticsCard key={metric.id} challenge={challenge} metric={metric} entries={entries.filter((entry) => entry.metricId === metric.id)} />
        ))}
      </div>
    </div>
  );
}
