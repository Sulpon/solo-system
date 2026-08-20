"use client";

import { useEffect, useMemo, useState } from "react";
import { StatValue } from "../../_lib/widgets/catalog-helpers";
import { getExerciseProgress, listLoggedExerciseNames } from "../../_lib/engines/workout-engine";
import ProgressLineChart from "./ProgressLineChart";
import type { WorkoutSession } from "../../_lib/types/workout";

const selectClass = "w-full max-w-xs rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400";

type ExerciseProgressPanelProps = Readonly<{ sessions: ReadonlyArray<WorkoutSession> }>;

export default function ExerciseProgressPanel({ sessions }: ExerciseProgressPanelProps) {
  const exerciseNames = useMemo(() => listLoggedExerciseNames(sessions), [sessions]);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  useEffect(() => {
    if (selectedExercise && exerciseNames.includes(selectedExercise)) {
      return;
    }

    setSelectedExercise(exerciseNames[0] ?? null);
  }, [exerciseNames, selectedExercise]);

  if (exerciseNames.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/45 p-6 text-center text-sm text-slate-400">
        Log a workout with sets to start tracking exercise progress.
      </div>
    );
  }

  const activeExercise = selectedExercise && exerciseNames.includes(selectedExercise) ? selectedExercise : exerciseNames[0];
  const progress = getExerciseProgress(sessions, activeExercise);
  const unitLabel = progress.unit && progress.unit !== "bodyweight" ? ` (${progress.unit})` : "";
  const lastPerformedLabel = progress.daysSinceLastPerformed === null ? "—" : progress.daysSinceLastPerformed === 0 ? "Today" : `${progress.daysSinceLastPerformed}d ago`;

  return (
    <div className="space-y-5">
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Exercise</span>
        <select value={activeExercise} onChange={(event) => setSelectedExercise(event.target.value)} className={selectClass}>
          {exerciseNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatValue label={`Best Weight${unitLabel}`} value={progress.bestWeight > 0 ? progress.bestWeight.toLocaleString() : "—"} />
        <StatValue label="Best Est. 1RM" value={progress.bestEstimated1RM > 0 ? progress.bestEstimated1RM.toLocaleString() : "—"} />
        <StatValue label="Best Set Volume" value={progress.bestVolume > 0 ? progress.bestVolume.toLocaleString() : "—"} />
        <StatValue label="Sessions" value={progress.sessionCount} />
        <StatValue label="Last Performed" value={lastPerformedLabel} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Weight Progression</p>
          <div className="mt-2">
            <ProgressLineChart points={progress.history.map((point) => ({ date: point.date, value: point.maxWeight }))} emptyText="No weight logged yet." />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Volume Progression</p>
          <div className="mt-2">
            <ProgressLineChart points={progress.history.map((point) => ({ date: point.date, value: point.volume }))} emptyText="No volume logged yet." />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Estimated 1RM</p>
          <div className="mt-2">
            <ProgressLineChart points={progress.history.map((point) => ({ date: point.date, value: point.estimated1RM }))} emptyText="No sets logged yet." />
          </div>
        </div>
      </div>
    </div>
  );
}
