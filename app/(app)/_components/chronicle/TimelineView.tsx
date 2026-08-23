"use client";

import { useMemo, useState } from "react";
import { getTimelineEntries } from "../../_lib/engines/chronicle-engine";
import { getLocalDayKey, parseLocalDayKey } from "../../_lib/local-day";
import { useDocumentPhotoUrl } from "../../_lib/hooks/useDocumentPhotoUrl";
import type { ChronicleContext, TimelineEntry } from "../../_lib/engines/chronicle-engine";

type TimelineViewProps = Readonly<{
  context: ChronicleContext;
  onSelectDate: (date: string) => void;
}>;

type RangeMode = "week" | "month" | "90days" | "all";

const RANGE_OPTIONS: ReadonlyArray<{ mode: RangeMode; label: string }> = [
  { mode: "week", label: "Week" },
  { mode: "month", label: "Month" },
  { mode: "90days", label: "90 Days" },
  { mode: "all", label: "All" },
];

function getRangeStart(mode: RangeMode, today: Date, earliestDate: string): string {
  if (mode === "all") {
    return earliestDate;
  }

  const start = new Date(today);
  if (mode === "week") start.setDate(start.getDate() - 6);
  if (mode === "month") start.setDate(start.getDate() - 29);
  if (mode === "90days") start.setDate(start.getDate() - 89);
  const startKey = getLocalDayKey(start);
  return startKey > earliestDate ? startKey : earliestDate;
}

function formatCardDate(date: string) {
  const parsed = parseLocalDayKey(date);
  return parsed.toLocaleDateString(undefined, { day: "2-digit", month: "short" }).toUpperCase();
}

function TimelinePhoto({ photoId, fileName }: { photoId: string; fileName: string }) {
  const url = useDocumentPhotoUrl(photoId);

  if (!url) {
    return null;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={fileName} className="h-16 w-16 shrink-0 rounded-lg border border-slate-800 object-cover" />;
}

function TimelineCard({ entry, onSelectDate }: { entry: TimelineEntry; onSelectDate: (date: string) => void }) {
  return (
    <button type="button" onClick={() => onSelectDate(entry.date)} className="flex w-full items-start gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-left transition hover:border-purple-400/40 hover:bg-slate-900/60">
      <div className="w-14 shrink-0 text-center">
        <p className="text-xs font-black text-purple-300">{formatCardDate(entry.date)}</p>
      </div>
      <div className="min-w-0 flex-1">
        {entry.narrative ? <p className={"text-sm leading-6 " + (entry.isAutoSummary ? "text-slate-500" : "text-slate-200")}>{entry.narrative}</p> : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          {entry.xpEarned > 0 ? <span className="font-semibold text-purple-300">+{entry.xpEarned.toLocaleString()} XP</span> : null}
          {entry.questsScheduledCount > 0 ? (
            <span>
              {entry.questsCompletedCount}/{entry.questsScheduledCount} quests
            </span>
          ) : null}
          {entry.hasWorkout ? <span>Workout logged</span> : null}
        </div>
      </div>
      {entry.photos.length > 0 ? <TimelinePhoto photoId={entry.photos[0].id} fileName={entry.photos[0].fileName} /> : null}
    </button>
  );
}

export default function TimelineView({ context, onSelectDate }: TimelineViewProps) {
  const [rangeMode, setRangeMode] = useState<RangeMode>("month");
  const today = useMemo(() => new Date(), []);
  const todayKey = getLocalDayKey(today);

  const earliestQuestDate = context.quests.reduce((earliest, quest) => (quest.createdAt && (!earliest || quest.createdAt < earliest) ? getLocalDayKey(quest.createdAt) : earliest), "" as string);
  const earliestDate = earliestQuestDate || todayKey;

  const startDate = getRangeStart(rangeMode, today, earliestDate);
  const entries = getTimelineEntries(startDate, todayKey, context);

  return (
    <div className="rounded-2xl border border-purple-500/25 bg-slate-950/55 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-white">Timeline</h2>
        <div className="flex gap-2">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.mode}
              type="button"
              onClick={() => setRangeMode(option.mode)}
              className={
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition " +
                (rangeMode === option.mode ? "border-purple-400/60 bg-purple-500/15 text-purple-100" : "border-slate-700 bg-slate-950/60 text-slate-400 hover:border-purple-400/40 hover:text-white")
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No recorded activity or journal entries in this range yet.</p>
      ) : (
        <div className="mt-5 space-y-2.5">
          {entries.map((entry) => (
            <TimelineCard key={entry.date} entry={entry} onSelectDate={onSelectDate} />
          ))}
        </div>
      )}
    </div>
  );
}
