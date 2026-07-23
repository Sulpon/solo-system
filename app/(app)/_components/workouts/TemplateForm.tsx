"use client";

import { useState } from "react";
import Modal from "../Modal";
import ExerciseFieldRow from "./ExerciseFieldRow";
import { useExerciseLibrary } from "../../_lib/hooks/useExerciseLibrary";
import type { TemplateExercise, WorkoutTemplate } from "../../_lib/types/workout";

export type TemplateFormModel = Readonly<{
  id?: string;
  title: string;
  description: string;
  exercises: TemplateExercise[];
}>;

type TemplateFormProps = Readonly<{
  form: TemplateFormModel;
  isEditing: boolean;
  onCancel: () => void;
  onSave: (form: TemplateFormModel) => void;
}>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

function createExercise(order: number): TemplateExercise {
  return {
    id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    unit: "kg",
    muscleGroup: "",
    notes: "",
    targetReps: [10, 10, 10],
    restSeconds: 90,
    order,
  };
}

export function createEmptyTemplateForm(): TemplateFormModel {
  return { title: "", description: "", exercises: [createExercise(0)] };
}

export function templateToForm(template: WorkoutTemplate): TemplateFormModel {
  return {
    id: template.id,
    title: template.title,
    description: template.description ?? "",
    exercises: [...template.exercises].sort((first, second) => first.order - second.order),
  };
}

const EXERCISE_DATALIST_ID = "workout-exercise-options";

export default function TemplateForm({ form, isEditing, onCancel, onSave }: TemplateFormProps) {
  const [title, setTitle] = useState(form.title);
  const [description, setDescription] = useState(form.description);
  const [exercises, setExercises] = useState<TemplateExercise[]>(form.exercises);
  const { exercises: savedExercises, rememberExercise } = useExerciseLibrary();

  function updateExercise(index: number, next: TemplateExercise) {
    setExercises((current) => current.map((exercise, exerciseIndex) => (exerciseIndex === index ? next : exercise)));
  }

  function moveExercise(index: number, direction: -1 | 1) {
    setExercises((current) => {
      const targetIndex = index + direction;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next.map((exercise, exerciseIndex) => ({ ...exercise, order: exerciseIndex }));
    });
  }

  function removeExercise(index: number) {
    setExercises((current) => current.filter((_, exerciseIndex) => exerciseIndex !== index).map((exercise, exerciseIndex) => ({ ...exercise, order: exerciseIndex })));
  }

  function addExercise() {
    setExercises((current) => [...current, createExercise(current.length)]);
  }

  function handleSave() {
    if (!title.trim()) {
      return;
    }

    const cleanedExercises = exercises.filter((exercise) => exercise.name.trim().length > 0).map((exercise, index) => ({ ...exercise, name: exercise.name.trim(), order: index }));
    cleanedExercises.forEach((exercise) => rememberExercise(exercise.name, exercise.unit, exercise.muscleGroup));
    onSave({ id: form.id, title: title.trim(), description: description.trim(), exercises: cleanedExercises });
  }

  return (
    <Modal title={isEditing ? "Edit Template" : "Create Template"} onClose={onCancel} wide>
      <datalist id={EXERCISE_DATALIST_ID}>
        {savedExercises.map((entry) => (
          <option key={entry.id} value={entry.name} />
        ))}
      </datalist>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClass}>Template Title</span>
            <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} placeholder="Push Day" />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Description (optional)</span>
            <input value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} placeholder="Chest, shoulders, triceps" />
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className={labelClass}>Exercises</p>
            <button type="button" onClick={addExercise} className="rounded-lg border border-purple-400/50 bg-purple-500/15 px-3 py-1.5 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/25">
              + Add Exercise
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {exercises.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/45 p-4 text-center text-sm text-slate-400">No exercises yet. Add your first one.</div>
            ) : (
              exercises.map((exercise, index) => (
                <ExerciseFieldRow
                  key={exercise.id}
                  exercise={exercise}
                  canMoveUp={index > 0}
                  canMoveDown={index < exercises.length - 1}
                  onChange={(next) => updateExercise(index, next)}
                  onMoveUp={() => moveExercise(index, -1)}
                  onMoveDown={() => moveExercise(index, 1)}
                  onRemove={() => removeExercise(index)}
                  savedExercises={savedExercises}
                  nameDatalistId={EXERCISE_DATALIST_ID}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
          Cancel
        </button>
        <button type="button" onClick={handleSave} className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
          Save Template
        </button>
      </div>
    </Modal>
  );
}
