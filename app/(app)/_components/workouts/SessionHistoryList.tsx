"use client";

import { formatFocusDuration } from "../focus/focus-format";
import type { WorkoutSession } from "../../_lib/types/workout";

type SessionHistoryListProps = Readonly<{
  sessions: ReadonlyArray<WorkoutSession>;
  onSelect: (session: WorkoutSession) => void;
}>;

export default function SessionHistoryList({ sessions, onSelect }: SessionHistoryListProps) {
  if (sessions.length === 0) {
    return <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center text-sm text-slate-400">No workouts logged yet.</div>;
  }

  const sorted = [...sessions].sort((first, second) => new Date(second.endedAt).getTime() - new Date(first.endedAt).getTime());

  return (
    <div className="space-y-2">
      {sorted.map((session) => (
        <button
          key={session.id}
          type="button"
          onClick={() => onSelect(session)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-left transition hover:border-purple-400/40"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{session.templateTitle ?? "Freeform Workout"}</p>
            <p className="mt-1 text-xs text-slate-500">
              {new Date(session.endedAt).toLocaleDateString()} · {session.exerciseLogs.length} exercises · {formatFocusDuration(session.durationSeconds)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {session.personalRecordsAchieved.length > 0 ? (
              <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200">
                {session.personalRecordsAchieved.length} PR{session.personalRecordsAchieved.length === 1 ? "" : "s"}
              </span>
            ) : null}
            <span className="text-sm font-bold text-purple-200">{session.totalVolume.toLocaleString()}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
