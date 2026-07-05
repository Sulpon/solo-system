"use client";

import Card from "../Card";
import type { ActivityEvent } from "../../_lib/types/activity-event";

type TodayProgressFeedProps = Readonly<{
  events: ReadonlyArray<ActivityEvent>;
  reviewedToday: boolean;
}>;

function eventAccent(type: ActivityEvent["type"]) {
  if (type === "daily_snapshot_saved") {
    return "text-emerald-300";
  }

  if (type === "attribute_xp_awarded") {
    return "text-cyan-200";
  }

  if (type.includes("completed")) {
    return "text-purple-200";
  }

  return "text-amber-200";
}

function eventMeta(event: ActivityEvent) {
  const xp = event.metadata.xp;

  if (typeof xp === "number") {
    return `+${xp.toLocaleString()} XP`;
  }

  if (event.type === "progress_goal_updated" && typeof event.metadata.oldValue === "number" && typeof event.metadata.newValue === "number") {
    return `${event.metadata.oldValue.toLocaleString()} -> ${event.metadata.newValue.toLocaleString()}`;
  }

  if (event.type === "daily_snapshot_saved" && typeof event.metadata.dailySuccessPercent === "number") {
    return `${event.metadata.dailySuccessPercent}%`;
  }

  return event.type.replaceAll("_", " ");
}

export default function TodayProgressFeed({ events, reviewedToday }: TodayProgressFeedProps) {
  const items = events.slice(0, 8);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Today&apos;s Progress</p>
          <h2 className="mt-1 text-xl font-black text-white">Activity feed</h2>
        </div>
        {reviewedToday ? (
          <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">Reviewed</span>
        ) : null}
      </div>

      <div className="mt-5 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/45 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{item.description ?? item.type.replaceAll("_", " ")}</p>
              </div>
              <span className={"shrink-0 text-sm font-semibold " + eventAccent(item.type)}>{eventMeta(item)}</span>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-5 text-sm text-slate-400">
            Complete quests to generate today&apos;s progress.
          </div>
        )}
      </div>
    </Card>
  );
}
