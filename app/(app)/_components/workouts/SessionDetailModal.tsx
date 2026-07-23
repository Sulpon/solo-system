"use client";

import Modal from "../Modal";
import { formatFocusDuration } from "../focus/focus-format";
import PRTimeline from "./PRTimeline";
import type { WorkoutSession } from "../../_lib/types/workout";

type SessionDetailModalProps = Readonly<{
  session: WorkoutSession;
  onClose: () => void;
}>;

export default function SessionDetailModal({ session, onClose }: SessionDetailModalProps) {
  return (
    <Modal title={session.templateTitle ?? "Freeform Workout"} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Duration</p>
            <p className="mt-1 text-lg font-bold text-white">{formatFocusDuration(session.durationSeconds)}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Volume</p>
            <p className="mt-1 text-lg font-bold text-white">{session.totalVolume.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Date</p>
            <p className="mt-1 text-lg font-bold text-white">{new Date(session.endedAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="space-y-2">
          {session.exerciseLogs.map((log) => (
            <div key={log.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-sm font-bold text-white">{log.name}</p>
              <div className="mt-2 space-y-1">
                {log.sets.map((set) => (
                  <div key={set.id} className="flex items-center justify-between text-sm text-slate-300">
                    <span>Set {set.setNumber}</span>
                    <span>
                      {set.weight} {set.unit !== "bodyweight" ? set.unit : set.bodyweightMode ?? ""} × {set.reps} reps
                      {typeof set.rpe === "number" ? ` · RPE ${set.rpe}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {session.personalRecordsAchieved.length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Personal Records</p>
            <div className="mt-2">
              <PRTimeline records={session.personalRecordsAchieved} />
            </div>
          </div>
        ) : null}

        {session.notes ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3 text-sm text-slate-300">{session.notes}</div>
        ) : null}
      </div>

      <div className="mt-6 flex justify-end">
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
          Close
        </button>
      </div>
    </Modal>
  );
}
