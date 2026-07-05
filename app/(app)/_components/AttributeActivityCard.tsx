"use client";

import Card from "./Card";
import { getEventsByAttribute } from "../_lib/activity-events";
import type { ActivityEvent } from "../_lib/types/activity-event";
import type { CategoryId } from "../_lib/types/category";

type AttributeActivityCardProps = Readonly<{
  categoryId: CategoryId;
  title?: string;
  accentClass: string;
  events: ReadonlyArray<ActivityEvent>;
}>;

function formatActivityMeta(event: ActivityEvent) {
  if (typeof event.metadata.xp === "number") {
    return `+${event.metadata.xp.toLocaleString()} XP`;
  }

  if (event.type === "progress_goal_updated" && typeof event.metadata.oldValue === "number" && typeof event.metadata.newValue === "number") {
    return `${event.metadata.oldValue.toLocaleString()} -> ${event.metadata.newValue.toLocaleString()}`;
  }

  return event.type.replaceAll("_", " ");
}

export default function AttributeActivityCard({ categoryId, title = "Recent Activity", accentClass, events }: AttributeActivityCardProps) {
  const items = getEventsByAttribute(events, categoryId).slice(0, 6);

  return (
    <Card className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
      <h2 className={"text-xl font-bold " + accentClass}>{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length > 0 ? (
          items.map((event) => (
            <div key={event.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{event.title}</p>
                <p className="mt-1 text-xs text-slate-500">{event.description ?? event.type.replaceAll("_", " ")}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-cyan-200">{formatActivityMeta(event)}</span>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/45 p-4">
            <p className="font-semibold text-white">No recent activity yet</p>
            <p className="mt-1 text-sm text-slate-400">Events for this attribute will appear here automatically.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
