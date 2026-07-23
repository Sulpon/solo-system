"use client";

import { useState } from "react";
import { formatFocusDuration } from "../focus/focus-format";
import type { BodyweightMode, ExerciseLog, SetInput } from "../../_lib/types/workout";

const smallInputClass = "w-full rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-2 text-sm text-white outline-none focus:border-purple-400";

export type ExerciseSetsCardProps = Readonly<{
  log: ExerciseLog;
  onUpdateSet: (setId: string, patch: Partial<SetInput>) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onRemoveExercise: () => void;
  restSecondsDefault?: number;
  isResting?: boolean;
  restRemainingSeconds?: number;
  onStartRest?: () => void;
}>;

export default function ExerciseSetsCard({
  log,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
  restSecondsDefault,
  isResting = false,
  restRemainingSeconds = 0,
  onStartRest,
}: ExerciseSetsCardProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setExpanded((current) => !current)} className="flex flex-1 items-center justify-between gap-3 text-left">
          <div>
            <p className="text-base font-bold text-white">{log.name}</p>
            <p className="text-xs text-slate-500">{log.sets.length} set{log.sets.length === 1 ? "" : "s"}</p>
          </div>
          <span className="text-slate-500">{expanded ? "−" : "+"}</span>
        </button>
        <button type="button" onClick={onRemoveExercise} aria-label="Remove exercise" className="shrink-0 text-xs text-rose-300 transition hover:text-rose-100">
          Remove
        </button>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-3">
          {isResting ? (
            <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-center text-sm font-semibold text-cyan-100">Resting: {formatFocusDuration(restRemainingSeconds)}</div>
          ) : null}

          <div className="space-y-2">
            {log.sets.map((set) => (
              <div key={set.id} className="grid grid-cols-[auto_1fr_1fr_1fr_auto_auto] items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-2">
                <span className="w-6 text-center text-xs font-semibold text-slate-500">{set.setNumber}</span>

                {log.unit === "bodyweight" ? (
                  <select
                    value={set.bodyweightMode ?? "bodyweight"}
                    onChange={(event) => onUpdateSet(set.id, { bodyweightMode: event.target.value as BodyweightMode, weight: event.target.value === "bodyweight" ? 0 : set.weight })}
                    className={smallInputClass}
                  >
                    <option value="bodyweight">Bodyweight</option>
                    <option value="weighted">Weighted</option>
                    <option value="assisted">Assisted</option>
                  </select>
                ) : (
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={log.unit}
                    value={set.weight === 0 ? "" : set.weight}
                    onChange={(event) => onUpdateSet(set.id, { weight: Math.max(0, Number(event.target.value) || 0) })}
                    className={smallInputClass}
                  />
                )}

                {log.unit === "bodyweight" && set.bodyweightMode !== "bodyweight" ? (
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={set.bodyweightMode === "assisted" ? "assist" : "added"}
                    value={set.weight === 0 ? "" : set.weight}
                    onChange={(event) => onUpdateSet(set.id, { weight: Math.max(0, Number(event.target.value) || 0) })}
                    className={smallInputClass}
                  />
                ) : (
                  <span aria-hidden="true" />
                )}

                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="reps"
                  value={set.reps === 0 ? "" : set.reps}
                  onChange={(event) => onUpdateSet(set.id, { reps: Math.max(0, Math.floor(Number(event.target.value) || 0)) })}
                  className={smallInputClass}
                />

                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="RPE"
                  min={0}
                  max={10}
                  value={set.rpe ?? ""}
                  onChange={(event) => onUpdateSet(set.id, { rpe: event.target.value === "" ? undefined : Math.max(0, Math.min(10, Number(event.target.value))) })}
                  className={smallInputClass + " w-16"}
                />

                <div className="flex items-center gap-1">
                  {onStartRest ? (
                    <button type="button" onClick={onStartRest} aria-label="Start rest timer" title={restSecondsDefault ? `Rest ${restSecondsDefault}s` : "Rest"} className="rounded-md px-1.5 py-1 text-cyan-300 transition hover:bg-cyan-400/10">
                      ⏱
                    </button>
                  ) : null}
                  <button type="button" onClick={() => onRemoveSet(set.id)} aria-label="Remove set" className="rounded-md px-1.5 py-1 text-rose-300 transition hover:bg-rose-500/10">
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={onAddSet} className="w-full rounded-lg border border-dashed border-slate-700 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:border-emerald-400/50 hover:text-emerald-200">
            + Add Set
          </button>
        </div>
      ) : null}
    </div>
  );
}
