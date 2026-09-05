"use client";

import { useMemo, useState } from "react";
import { useDocumentPhotoUrl } from "../../_lib/hooks/useDocumentPhotoUrl";
import { getChallengeDayKeys } from "../../_lib/engines/challenge-mission-engine";
import { getLocalDayKey } from "../../_lib/local-day";
import ChallengeNoteModal from "./ChallengeNoteModal";
import ChallengePhotoModal from "./ChallengePhotoModal";
import type { Challenge, ChallengeEntry, ChallengeMetric } from "../../_lib/types/challenge";

type ChallengeTrackerProps = Readonly<{
  challenge: Challenge;
  metrics: ReadonlyArray<ChallengeMetric>;
  entries: ReadonlyArray<ChallengeEntry>;
  onSetValue: (metricId: string, date: string, value: number | string | undefined) => void;
  onSetPhoto: (metricId: string, date: string, photoId: string | undefined) => void;
}>;

type ActiveEditor = Readonly<{ type: "text" | "photo"; metric: ChallengeMetric; date: string }>;

const RATING_OPTIONS = Array.from({ length: 11 }, (_, index) => index);

function dayCellClass(isToday: boolean, isFuture: boolean) {
  return "border-b border-slate-800/80 px-2 py-2 text-center " + (isToday ? "bg-purple-500/10" : "") + (isFuture ? " opacity-40" : "");
}

function PhotoThumbnail({ photoId }: Readonly<{ photoId: string }>) {
  const url = useDocumentPhotoUrl(photoId);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="mx-auto h-8 w-8 rounded-md object-cover" />
  ) : (
    <span className="text-xs text-slate-500">...</span>
  );
}

export default function ChallengeTracker({ challenge, metrics, entries, onSetValue, onSetPhoto }: ChallengeTrackerProps) {
  const [activeEditor, setActiveEditor] = useState<ActiveEditor | null>(null);
  const todayKey = getLocalDayKey();
  const dayKeys = useMemo(() => getChallengeDayKeys(challenge), [challenge]);

  const entryByKey = useMemo(() => {
    const map = new Map<string, ChallengeEntry>();
    entries.forEach((entry) => map.set(`${entry.metricId}:${entry.date}`, entry));
    return map;
  }, [entries]);

  if (metrics.length === 0) {
    return <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/45 p-6 text-center text-sm text-slate-400">No metrics defined for this challenge yet.</div>;
  }

  function renderCell(metric: ChallengeMetric, date: string, isFuture: boolean) {
    const entry = entryByKey.get(`${metric.id}:${date}`);

    if (isFuture) {
      return <span className="text-slate-700">—</span>;
    }

    if (metric.type === "boolean") {
      const checked = entry?.value === 1;
      return (
        <button
          type="button"
          onClick={() => onSetValue(metric.id, date, checked ? undefined : 1)}
          aria-label={`Toggle ${metric.name} for ${date}`}
          className={"flex h-7 w-7 items-center justify-center rounded-lg border transition " + (checked ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-300" : "border-slate-700 text-transparent hover:border-slate-500")}
        >
          ✓
        </button>
      );
    }

    if (metric.type === "number") {
      return (
        <input
          type="number"
          defaultValue={typeof entry?.value === "number" ? entry.value : ""}
          key={`${metric.id}:${date}:${entry?.value ?? ""}`}
          onBlur={(event) => {
            const raw = event.target.value.trim();
            onSetValue(metric.id, date, raw === "" ? undefined : Number(raw));
          }}
          className="w-14 rounded-md border border-slate-700 bg-slate-950/70 px-1.5 py-1 text-center text-xs text-white outline-none focus:border-purple-400"
        />
      );
    }

    if (metric.type === "rating") {
      return (
        <select
          value={typeof entry?.value === "number" ? entry.value : ""}
          onChange={(event) => onSetValue(metric.id, date, event.target.value === "" ? undefined : Number(event.target.value))}
          className="rounded-md border border-slate-700 bg-slate-950/70 px-1 py-1 text-center text-xs text-white outline-none focus:border-purple-400"
        >
          <option value="">—</option>
          {RATING_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      );
    }

    if (metric.type === "text") {
      const hasNote = typeof entry?.value === "string" && entry.value.trim() !== "";
      return (
        <button
          type="button"
          onClick={() => setActiveEditor({ type: "text", metric, date })}
          className={"max-w-[7rem] truncate rounded-md border px-2 py-1 text-xs transition " + (hasNote ? "border-amber-400/40 bg-amber-400/10 text-amber-200" : "border-slate-700 text-slate-500 hover:border-slate-500")}
          title={hasNote ? (entry?.value as string) : "Add note"}
        >
          {hasNote ? (entry?.value as string) : "+ Note"}
        </button>
      );
    }

    // photo
    return (
      <button type="button" onClick={() => setActiveEditor({ type: "photo", metric, date })} className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 hover:border-slate-500">
        {entry?.photoId ? <PhotoThumbnail photoId={entry.photoId} /> : <span className="text-xs text-slate-500">📷</span>}
      </button>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border-b border-slate-800 bg-slate-950 px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Day</th>
              {metrics.map((metric) => (
                <th key={metric.id} className="min-w-[96px] border-b border-slate-800 px-2 py-3 text-center text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                  {metric.name}
                  {metric.target !== undefined ? <span className="mt-0.5 block text-[10px] font-normal normal-case text-slate-600">target {metric.target}{metric.unit ? ` ${metric.unit}` : ""}</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dayKeys.map((date, index) => {
              const isToday = date === todayKey;
              const isFuture = date > todayKey;

              return (
                <tr key={date} className={isToday ? "relative" : undefined}>
                  <td className={"sticky left-0 z-10 whitespace-nowrap border-b border-slate-800/80 bg-slate-950 px-3 py-2 text-xs font-semibold " + (isToday ? "text-purple-300" : "text-slate-400")}>
                    Day {index + 1}
                    <span className="ml-2 text-slate-600">{date}</span>
                    {isToday ? <span className="ml-2 rounded-full border border-purple-400/40 bg-purple-500/15 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-purple-200">Today</span> : null}
                  </td>
                  {metrics.map((metric) => (
                    <td key={metric.id} className={dayCellClass(isToday, isFuture)}>
                      {renderCell(metric, date, isFuture)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeEditor?.type === "text" ? (
        <ChallengeNoteModal
          metricName={activeEditor.metric.name}
          date={activeEditor.date}
          initialValue={(entryByKey.get(`${activeEditor.metric.id}:${activeEditor.date}`)?.value as string) ?? ""}
          onSave={(value) => {
            onSetValue(activeEditor.metric.id, activeEditor.date, value === "" ? undefined : value);
            setActiveEditor(null);
          }}
          onClose={() => setActiveEditor(null)}
        />
      ) : null}

      {activeEditor?.type === "photo" ? (
        <ChallengePhotoModal
          metricName={activeEditor.metric.name}
          date={activeEditor.date}
          initialPhotoId={entryByKey.get(`${activeEditor.metric.id}:${activeEditor.date}`)?.photoId}
          onSave={(photoId) => {
            onSetPhoto(activeEditor.metric.id, activeEditor.date, photoId);
            setActiveEditor(null);
          }}
          onClose={() => setActiveEditor(null)}
        />
      ) : null}
    </>
  );
}
