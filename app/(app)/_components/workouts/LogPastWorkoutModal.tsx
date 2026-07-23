"use client";

import { useState } from "react";
import Modal from "../Modal";
import { useBodyweight } from "../../_lib/hooks/useBodyweight";
import { useExerciseLibrary } from "../../_lib/hooks/useExerciseLibrary";
import { useProgression } from "../../_lib/hooks/useProgression";
import { getLatestBodyweightKg } from "../../_lib/engines/workout-engine";
import { createWorkoutActivityEvents } from "../../_lib/activity-events";
import { appendSetToLog, createAdHocExerciseLog, createDefaultSetInput, createSeededExerciseLogs, createWorkoutSessionFromManualEntry } from "../../_lib/workout-storage";
import { getLocalDayKey } from "../../_lib/local-day";
import ExerciseSetsCard from "./ExerciseSetsCard";
import type { ExerciseLog, ExerciseUnit, SetInput, WorkoutSession, WorkoutTemplate } from "../../_lib/types/workout";

type LogPastWorkoutModalProps = Readonly<{
  templates: ReadonlyArray<WorkoutTemplate>;
  sessions: ReadonlyArray<WorkoutSession>;
  onSave: (session: WorkoutSession) => void;
  onClose: () => void;
}>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

export default function LogPastWorkoutModal({ templates, sessions, onSave, onClose }: LogPastWorkoutModalProps) {
  const { entries: bodyweightEntries } = useBodyweight();
  const { exercises: savedExercises, rememberExercise } = useExerciseLibrary();
  const { addActivityEvents } = useProgression();
  const todayKey = getLocalDayKey();
  const [date, setDate] = useState(todayKey);
  const [templateId, setTemplateId] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState("45");
  const [notes, setNotes] = useState("");
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseUnit, setNewExerciseUnit] = useState<ExerciseUnit>("kg");

  const template = templateId ? templates.find((item) => item.id === templateId) ?? null : null;

  function applyTemplate(nextTemplateId: string) {
    setTemplateId(nextTemplateId);
    const nextTemplate = nextTemplateId ? templates.find((item) => item.id === nextTemplateId) ?? null : null;
    setExerciseLogs(createSeededExerciseLogs(nextTemplate));
  }

  function updateSet(exerciseLogId: string, setId: string, patch: Partial<SetInput>) {
    setExerciseLogs((current) => current.map((log) => (log.id === exerciseLogId ? { ...log, sets: log.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)) } : log)));
  }

  function addSet(exerciseLogId: string, input: SetInput) {
    setExerciseLogs((current) => current.map((log) => (log.id === exerciseLogId ? appendSetToLog(log, input) : log)));
  }

  function removeSet(exerciseLogId: string, setId: string) {
    setExerciseLogs((current) =>
      current.map((log) => (log.id === exerciseLogId ? { ...log, sets: log.sets.filter((set) => set.id !== setId).map((set, index) => ({ ...set, setNumber: index + 1 })) } : log)),
    );
  }

  function removeExerciseLog(exerciseLogId: string) {
    setExerciseLogs((current) => current.filter((log) => log.id !== exerciseLogId));
  }

  function defaultRepsFor(log: ExerciseLog) {
    const targetReps = template?.exercises.find((exercise) => exercise.id === log.templateExerciseId)?.targetReps;
    return targetReps?.[targetReps.length - 1];
  }

  function handleNewExerciseNameChange(name: string) {
    setNewExerciseName(name);
    const match = savedExercises.find((entry) => entry.name.toLowerCase() === name.trim().toLowerCase());

    if (match) {
      setNewExerciseUnit(match.unit);
    }
  }

  function handleAddAdHocExercise() {
    const trimmed = newExerciseName.trim();

    if (!trimmed) {
      return;
    }

    const match = savedExercises.find((entry) => entry.name.toLowerCase() === trimmed.toLowerCase());
    setExerciseLogs((current) => [...current, createAdHocExerciseLog(trimmed, newExerciseUnit, current.length, match?.muscleGroup)]);
    rememberExercise(trimmed, newExerciseUnit, match?.muscleGroup);
    setNewExerciseName("");
    setShowAddExercise(false);
  }

  function handleSave() {
    const durationValue = Number(durationMinutes);

    if (!date || date > todayKey || !Number.isFinite(durationValue) || durationValue <= 0) {
      return;
    }

    const latestBodyweightKg = getLatestBodyweightKg(bodyweightEntries);
    const session = createWorkoutSessionFromManualEntry(
      { date, durationMinutes: durationValue, exerciseLogs, templateId: template?.id ?? null, templateTitle: template?.title, notes: notes.trim() || undefined },
      sessions,
      latestBodyweightKg,
    );

    if (session.exerciseLogs.length === 0) {
      return;
    }

    addActivityEvents(createWorkoutActivityEvents(session));
    onSave(session);
  }

  return (
    <Modal title="Log Past Workout" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-2">
            <span className={labelClass}>Date</span>
            <input type="date" value={date} max={todayKey} onChange={(event) => setDate(event.target.value || todayKey)} className={inputClass} />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Template (optional)</span>
            <select value={templateId} onChange={(event) => applyTemplate(event.target.value)} className={inputClass}>
              <option value="">Freeform</option>
              {templates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Duration (minutes)</span>
            <input type="number" min={1} value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} className={inputClass} />
          </label>
        </div>

        <div className="space-y-2">
          {exerciseLogs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/45 p-4 text-center text-sm text-slate-400">Choose a template or add exercises below.</div>
          ) : (
            exerciseLogs.map((log) => (
              <ExerciseSetsCard
                key={log.id}
                log={log}
                onAddSet={() => addSet(log.id, createDefaultSetInput(log, defaultRepsFor(log)))}
                onUpdateSet={(setId, patch) => updateSet(log.id, setId, patch)}
                onRemoveSet={(setId) => removeSet(log.id, setId)}
                onRemoveExercise={() => removeExerciseLog(log.id)}
              />
            ))
          )}
        </div>

        {showAddExercise ? (
          <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
            <input
              value={newExerciseName}
              onChange={(event) => handleNewExerciseNameChange(event.target.value)}
              placeholder="Exercise name"
              list="log-past-workout-exercise-options"
              autoComplete="off"
              className="min-w-[10rem] flex-1 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-purple-400"
            />
            <datalist id="log-past-workout-exercise-options">
              {savedExercises.map((entry) => (
                <option key={entry.id} value={entry.name} />
              ))}
            </datalist>
            <select value={newExerciseUnit} onChange={(event) => setNewExerciseUnit(event.target.value as ExerciseUnit)} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-purple-400">
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
              <option value="bodyweight">Bodyweight</option>
            </select>
            <button type="button" onClick={handleAddAdHocExercise} className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
              Add
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setShowAddExercise(true)} className="w-full rounded-xl border border-dashed border-slate-700 px-4 py-3 text-sm text-slate-400 transition hover:border-purple-400/50 hover:text-white">
            + Add Exercise
          </button>
        )}

        <label className="space-y-2">
          <span className={labelClass}>Notes (optional)</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass + " min-h-20"} />
        </label>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
          Cancel
        </button>
        <button type="button" onClick={handleSave} className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
          Save Workout
        </button>
      </div>
    </Modal>
  );
}
