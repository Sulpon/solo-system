"use client";

import Card from "../../_components/Card";
import Progress from "../../_components/Progress";
import { useAttributes } from "../hooks/useAttributes";
import { useBodyweight } from "../hooks/useBodyweight";
import { useFocusHistory } from "../hooks/useFocusHistory";
import { useGoalTree } from "../hooks/useGoalTree";
import { useProgression } from "../hooks/useProgression";
import { useWorkoutSessions } from "../hooks/useWorkoutSessions";
import { useWorkoutTemplates } from "../hooks/useWorkoutTemplates";
import { getLocalDayKey } from "../local-day";
import type { ActivityEvent } from "../types/activity-event";
import type { QuestCompletion } from "../types/quest";
import type { XpEvent } from "../types/progression";

export function useWidgetLiveContext() {
  const { goalTree } = useGoalTree();
  const { questDefinitions, questCompletions, activityEvents, dailySnapshots, progressionSummary, goalXpEvents, isReady } = useProgression();
  const { attributes } = useAttributes();
  const { history: focusHistory } = useFocusHistory();
  const { templates: workoutTemplates } = useWorkoutTemplates();
  const { sessions: workoutSessions } = useWorkoutSessions();
  const { entries: bodyweightEntries } = useBodyweight();

  return { goalTree, questDefinitions, questCompletions, activityEvents, dailySnapshots, progressionSummary, goalXpEvents, attributes, focusHistory, workoutTemplates, workoutSessions, bodyweightEntries, isReady };
}

export type WidgetLiveContext = ReturnType<typeof useWidgetLiveContext>;

export function WidgetShell({
  eyebrow,
  title,
  children,
}: Readonly<{
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}>) {
  return (
    <Card className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-black text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

export function EmptyWidgetState({ text = "No data yet." }: Readonly<{ text?: string }>) {
  return <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-5 text-sm text-slate-400">{text}</div>;
}

export function StatValue({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{typeof value === "number" ? value.toLocaleString() : value}</p>
    </div>
  );
}

export type MiniProgressItem = Readonly<{ id: string; title: string; subtitle?: string; progress: number }>;

export function MiniProgressList({ items, emptyText }: Readonly<{ items: ReadonlyArray<MiniProgressItem>; emptyText?: string }>) {
  if (items.length === 0) {
    return <EmptyWidgetState text={emptyText} />;
  }

  return (
    <div className="space-y-3">
      {items.slice(0, 6).map((item) => (
        <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{item.title}</p>
              {item.subtitle ? <p className="mt-1 text-xs text-slate-500">{item.subtitle}</p> : null}
            </div>
            <span className="shrink-0 text-sm font-semibold text-cyan-200">{item.progress}%</span>
          </div>
          <Progress value={item.progress} max={100} className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950/80" fillClassName="h-full bg-gradient-to-r from-purple-500 to-cyan-300" />
        </div>
      ))}
    </div>
  );
}

export function MiniActivityFeed({ events, emptyText }: Readonly<{ events: ReadonlyArray<ActivityEvent>; emptyText?: string }>) {
  if (events.length === 0) {
    return <EmptyWidgetState text={emptyText} />;
  }

  return (
    <div className="space-y-3">
      {events.slice(0, 6).map((event) => (
        <div key={event.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="truncate font-semibold text-white">{event.title}</p>
          <p className="mt-1 text-xs text-slate-500">{event.description ?? event.type.replaceAll("_", " ")}</p>
        </div>
      ))}
    </div>
  );
}

export type MiniChecklistItem = Readonly<{ id: string; title: string; xp?: number; completed: boolean }>;

export function MiniChecklist({ items, emptyText }: Readonly<{ items: ReadonlyArray<MiniChecklistItem>; emptyText?: string }>) {
  if (items.length === 0) {
    return <EmptyWidgetState text={emptyText} />;
  }

  return (
    <div className="space-y-2">
      {items.slice(0, 5).map((item) => (
        <div
          key={item.id}
          className={
            "flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm " +
            (item.completed ? "border-cyan-400/40 bg-cyan-400/10 text-white" : "border-slate-800 bg-slate-950/60 text-slate-300")
          }
        >
          <span className="min-w-0 truncate font-semibold">{item.title}</span>
          <span className="flex shrink-0 items-center gap-2">
            {typeof item.xp === "number" ? <span className="font-semibold text-purple-200">+{item.xp} XP</span> : null}
            <span className={item.completed ? "text-cyan-200" : "text-slate-500"}>{item.completed ? "Done" : "Open"}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function MiniBars({ values, labels }: Readonly<{ values: ReadonlyArray<number>; labels?: ReadonlyArray<string> }>) {
  const max = Math.max(...values, 1);

  if (values.every((value) => value === 0)) {
    return <EmptyWidgetState text="No XP recorded for this range yet." />;
  }

  return (
    <div>
      <div className="flex h-32 items-end gap-1.5">
        {values.map((value, index) => (
          <div key={index} className="flex h-full flex-1 items-end">
            <div className="w-full rounded-t-md bg-gradient-to-t from-purple-600 to-cyan-300 shadow-[0_0_14px_rgba(168,85,247,0.2)]" style={{ height: `${Math.max(4, (value / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      {labels ? (
        <div className="mt-2 flex gap-1.5 text-center text-[10px] uppercase tracking-wide text-slate-600">
          {labels.map((label, index) => (
            <span key={index} className="flex-1">
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function MiniHeatmap({ values, columns = 7 }: Readonly<{ values: ReadonlyArray<number>; columns?: number }>) {
  const max = Math.max(...values, 1);

  if (values.every((value) => value === 0)) {
    return <EmptyWidgetState text="No activity recorded yet." />;
  }

  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {values.map((value, index) => {
        const intensity = value <= 0 ? 0 : Math.min(1, value / max);

        return (
          <div
            key={index}
            className="aspect-square rounded-md border border-slate-800"
            style={{ backgroundColor: intensity > 0 ? `rgba(168, 85, 247, ${0.14 + intensity * 0.72})` : "rgba(15, 23, 42, 0.45)" }}
          />
        );
      })}
    </div>
  );
}

export type RadarItem = Readonly<{ label: string; value: number }>;

export function MiniRadar({ items }: Readonly<{ items: ReadonlyArray<RadarItem> }>) {
  if (items.length < 3) {
    return <EmptyWidgetState text="Add at least 3 attributes to see a radar chart." />;
  }

  const center = 50;
  const radius = 42;
  const angleStep = (Math.PI * 2) / items.length;

  const axisPoints = items.map((_, index) => {
    const angle = -Math.PI / 2 + index * angleStep;
    return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
  });

  const valuePoints = items
    .map((item, index) => {
      const angle = -Math.PI / 2 + index * angleStep;
      const r = (Math.max(0, Math.min(100, item.value)) / 100) * radius;
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="mx-auto h-48 w-48" aria-hidden>
      {[0.33, 0.66, 1].map((ring) => (
        <polygon
          key={ring}
          points={axisPoints.map(({ x, y }) => `${center + (x - center) * ring},${center + (y - center) * ring}`).join(" ")}
          className="fill-none stroke-slate-800"
          strokeWidth="1"
        />
      ))}
      {axisPoints.map((point, index) => (
        <line key={index} x1={center} y1={center} x2={point.x} y2={point.y} className="stroke-slate-800" strokeWidth="1" />
      ))}
      <polygon points={valuePoints} className="fill-purple-500/25 stroke-cyan-300" strokeWidth="2" />
    </svg>
  );
}

type XpEntry = Readonly<{ completedAt: string; amount: number }>;

export function combineXpEntries(completions: ReadonlyArray<QuestCompletion>, goalXpEvents: ReadonlyArray<XpEvent>): XpEntry[] {
  return [
    ...completions.map((completion) => ({ completedAt: completion.completedAt, amount: completion.xpAwarded })),
    ...goalXpEvents.map((event) => ({ completedAt: event.createdAt, amount: event.amount })),
  ];
}

export function getDailyXpBuckets(entries: ReadonlyArray<XpEntry>, days: number, referenceDate = new Date()) {
  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);
  const start = new Date(referenceDate);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const bucketsByKey = new Map<string, number>();
  const orderedKeys: string[] = [];

  for (let index = 0; index < days; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = getLocalDayKey(date);
    orderedKeys.push(key);
    bucketsByKey.set(key, 0);
  }

  for (const entry of entries) {
    const time = new Date(entry.completedAt).getTime();

    if (time < start.getTime() || time > end.getTime()) {
      continue;
    }

    const key = getLocalDayKey(entry.completedAt);

    if (bucketsByKey.has(key)) {
      bucketsByKey.set(key, (bucketsByKey.get(key) ?? 0) + entry.amount);
    }
  }

  return orderedKeys.map((key) => bucketsByKey.get(key) ?? 0);
}

export function getWeeklyXpBuckets(entries: ReadonlyArray<XpEntry>, referenceDate = new Date()) {
  const values = getDailyXpBuckets(entries, 28, referenceDate);
  return [0, 1, 2, 3].map((weekIndex) => values.slice(weekIndex * 7, weekIndex * 7 + 7).reduce((sum, value) => sum + value, 0));
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function getMonthlyXpBuckets(entries: ReadonlyArray<XpEntry>, referenceDate = new Date()) {
  const buckets = new Array(12).fill(0);
  const year = referenceDate.getFullYear();

  for (const entry of entries) {
    const date = new Date(entry.completedAt);

    if (date.getFullYear() !== year) {
      continue;
    }

    buckets[date.getMonth()] += entry.amount;
  }

  return { values: buckets as number[], labels: MONTH_LABELS };
}

export function getLifetimeXpTotal(entries: ReadonlyArray<XpEntry>) {
  return entries.reduce((total, entry) => total + entry.amount, 0);
}
