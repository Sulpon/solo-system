"use client";

import type { ExerciseLibraryEntry, ExerciseUnit, TemplateExercise } from "../../_lib/types/workout";

type ExerciseFieldRowProps = Readonly<{
  exercise: TemplateExercise;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (next: TemplateExercise) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  savedExercises?: ReadonlyArray<ExerciseLibraryEntry>;
  nameDatalistId?: string;
}>;

const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500";

export default function ExerciseFieldRow({ exercise, canMoveUp, canMoveDown, onChange, onMoveUp, onMoveDown, onRemove, savedExercises = [], nameDatalistId }: ExerciseFieldRowProps) {
  function handleNameChange(name: string) {
    // If the typed name matches a saved exercise, adopt its unit/muscle group
    // too - picking from the dropdown should feel like selecting the whole
    // exercise, not just its name.
    const match = savedExercises.find((entry) => entry.name.toLowerCase() === name.trim().toLowerCase());

    if (match) {
      onChange({ ...exercise, name, unit: match.unit, muscleGroup: exercise.muscleGroup || match.muscleGroup || "" });
      return;
    }

    onChange({ ...exercise, name });
  }

  function updateRepAt(index: number, reps: number) {
    const next = exercise.targetReps.map((value, valueIndex) => (valueIndex === index ? Math.max(1, Math.floor(reps) || 1) : value));
    onChange({ ...exercise, targetReps: next });
  }

  function addSet() {
    const last = exercise.targetReps[exercise.targetReps.length - 1] ?? 10;
    onChange({ ...exercise, targetReps: [...exercise.targetReps, last] });
  }

  function removeSetAt(index: number) {
    if (exercise.targetReps.length <= 1) {
      return;
    }

    onChange({ ...exercise, targetReps: exercise.targetReps.filter((_, valueIndex) => valueIndex !== index) });
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-1 pt-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label="Move exercise up"
            className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-700 text-xs text-slate-400 transition hover:border-purple-400/50 hover:text-white disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label="Move exercise down"
            className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-700 text-xs text-slate-400 transition hover:border-purple-400/50 hover:text-white disabled:opacity-30"
          >
            ↓
          </button>
        </div>

        <div className="grid flex-1 gap-2.5 sm:grid-cols-6">
          <label className="space-y-1 sm:col-span-2">
            <span className={labelClass}>Exercise Name</span>
            <input
              value={exercise.name}
              onChange={(event) => handleNameChange(event.target.value)}
              className={inputClass}
              placeholder="Bench Press"
              list={nameDatalistId}
              autoComplete="off"
            />
          </label>
          <label className="space-y-1">
            <span className={labelClass}>Unit</span>
            <select value={exercise.unit} onChange={(event) => onChange({ ...exercise, unit: event.target.value as ExerciseUnit })} className={inputClass}>
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
              <option value="bodyweight">Bodyweight</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className={labelClass}>Muscle Group</span>
            <input value={exercise.muscleGroup ?? ""} onChange={(event) => onChange({ ...exercise, muscleGroup: event.target.value })} className={inputClass} placeholder="Chest" />
          </label>
          <label className="space-y-1">
            <span className={labelClass}>Rest (sec)</span>
            <input type="number" min={0} value={exercise.restSeconds} onChange={(event) => onChange({ ...exercise, restSeconds: Math.max(0, Number(event.target.value)) })} className={inputClass} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className={labelClass}>Notes</span>
            <input value={exercise.notes ?? ""} onChange={(event) => onChange({ ...exercise, notes: event.target.value })} className={inputClass} placeholder="Optional cues or form notes" />
          </label>

          <div className="space-y-1 sm:col-span-6">
            <span className={labelClass}>Target Reps Per Set</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {exercise.targetReps.map((reps, index) => (
                <div key={index} className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950/70 py-1 pl-2 pr-1">
                  <span className="text-[10px] font-semibold text-slate-500">#{index + 1}</span>
                  <input
                    type="number"
                    min={1}
                    value={reps}
                    onChange={(event) => updateRepAt(index, Number(event.target.value))}
                    className="w-12 bg-transparent text-sm text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeSetAt(index)}
                    disabled={exercise.targetReps.length <= 1}
                    aria-label={`Remove set ${index + 1}`}
                    className="rounded-md px-1 text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-30"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addSet}
                className="rounded-lg border border-dashed border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-emerald-400/50 hover:text-emerald-200"
              >
                + Set
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove exercise"
          className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-rose-300 transition hover:bg-rose-500/10"
        >
          ×
        </button>
      </div>
    </div>
  );
}
