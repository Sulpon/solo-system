"use client";

import { useState } from "react";
import { useWorkout } from "../../_lib/workout-store";
import { useWorkoutTemplates } from "../../_lib/hooks/useWorkoutTemplates";
import { useExerciseLibrary } from "../../_lib/hooks/useExerciseLibrary";
import { useProgression } from "../../_lib/hooks/useProgression";
import { useQuestCompletionFlow } from "../quests/useQuestCompletionFlow";
import QuestCompletionModal from "../quests/QuestCompletionModal";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { findGoalNode } from "../../_lib/goal-tree-storage";
import { formatFocusDuration } from "../focus/focus-format";
import { createDefaultSetInput } from "../../_lib/workout-storage";
import ExerciseSetsCard from "./ExerciseSetsCard";
import type { ExerciseLog, ExerciseUnit } from "../../_lib/types/workout";

const buttonClass = "rounded-xl border px-4 py-2.5 text-sm font-semibold transition";
const primaryButtonClass = buttonClass + " border-emerald-500/50 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25";
const quietButtonClass = buttonClass + " border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white";
const dangerButtonClass = buttonClass + " border-rose-500/40 text-rose-200 hover:border-rose-300 hover:text-white";

export default function ActiveWorkoutOverlay() {
  const { activeSession, elapsedSeconds, restRemainingSeconds, isMinimized, addSet, updateSet, removeSet, addAdHocExercise, removeExerciseLog, startRestTimer, clearRestTimer, finishSession, discardSession, minimize } = useWorkout();
  const { templates } = useWorkoutTemplates();
  const { exercises: savedExercises, rememberExercise } = useExerciseLibrary();
  const { questDefinitions } = useProgression();
  const { goalTree } = useGoalTree();
  const { pendingQuest, pendingGoal, progressValue, setProgressValue, beginQuestCompletion, confirmQuestCompletion, cancelQuestCompletion } = useQuestCompletionFlow();
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseUnit, setNewExerciseUnit] = useState<ExerciseUnit>("kg");

  const template = activeSession?.templateId ? templates.find((item) => item.id === activeSession.templateId) ?? null : null;
  const linkedQuest = activeSession?.linkedQuestId ? questDefinitions.find((quest) => quest.id === activeSession.linkedQuestId) ?? null : null;

  if (!activeSession || isMinimized) {
    return null;
  }

  function restSecondsFor(log: ExerciseLog) {
    const templateExercise = template?.exercises.find((exercise) => exercise.id === log.templateExerciseId);
    return templateExercise?.restSeconds ?? 90;
  }

  function defaultRepsFor(log: ExerciseLog) {
    const targetReps = template?.exercises.find((exercise) => exercise.id === log.templateExerciseId)?.targetReps;
    return targetReps?.[targetReps.length - 1];
  }

  function completeFinish() {
    finishSession();
  }

  function handleFinishWorkout() {
    if (!linkedQuest) {
      completeFinish();
      return;
    }

    const willOpenModal = Boolean(linkedQuest.linkedProgressGoalId) && Boolean(findGoalNode(goalTree, linkedQuest.linkedProgressGoalId as string));
    const accepted = beginQuestCompletion(linkedQuest);

    if (!accepted || !willOpenModal) {
      completeFinish();
    }
  }

  function handleConfirmFromModal() {
    const completed = confirmQuestCompletion();

    if (completed) {
      completeFinish();
    }
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
    addAdHocExercise(trimmed, newExerciseUnit, match?.muscleGroup);
    rememberExercise(trimmed, newExerciseUnit, match?.muscleGroup);
    setNewExerciseName("");
    setShowAddExercise(false);
  }

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-950 px-4 py-8 motion-reduce:transition-none sm:px-6">
      <button
        type="button"
        onClick={minimize}
        aria-label="Minimize workout session"
        className="fixed right-6 top-6 z-10 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 transition hover:border-purple-400/50 hover:text-white"
      >
        —
      </button>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">{linkedQuest ? "Quest Workout" : "Freeform Workout"}</p>
          <h1 className="mt-1 text-2xl font-black text-white">{activeSession.templateTitle ?? linkedQuest?.title ?? "Workout Session"}</h1>
          <p className="mt-2 tabular-nums text-3xl font-black text-emerald-200">{formatFocusDuration(elapsedSeconds)}</p>
        </div>

        {pendingQuest ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-center">
            <p className="text-lg font-bold text-white">Confirming quest completion…</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {activeSession.exerciseLogs.map((log) => (
                <ExerciseSetsCard
                  key={log.id}
                  log={log}
                  restSecondsDefault={restSecondsFor(log)}
                  isResting={activeSession.restTimer?.exerciseLogId === log.id && restRemainingSeconds > 0}
                  restRemainingSeconds={restRemainingSeconds}
                  onAddSet={() => addSet(log.id, createDefaultSetInput(log, defaultRepsFor(log)))}
                  onUpdateSet={(setId, patch) => updateSet(log.id, setId, patch)}
                  onRemoveSet={(setId) => removeSet(log.id, setId)}
                  onStartRest={() => startRestTimer(log.id, restSecondsFor(log))}
                  onRemoveExercise={() => removeExerciseLog(log.id)}
                />
              ))}
            </div>

            {activeSession.restTimer && restRemainingSeconds <= 0 ? (
              <button type="button" onClick={clearRestTimer} className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100">
                Rest complete - tap to dismiss
              </button>
            ) : null}

            {showAddExercise ? (
              <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                <input
                  value={newExerciseName}
                  onChange={(event) => handleNewExerciseNameChange(event.target.value)}
                  placeholder="Exercise name"
                  list="active-workout-exercise-options"
                  autoComplete="off"
                  className="min-w-[10rem] flex-1 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-purple-400"
                />
                <datalist id="active-workout-exercise-options">
                  {savedExercises.map((entry) => (
                    <option key={entry.id} value={entry.name} />
                  ))}
                </datalist>
                <select value={newExerciseUnit} onChange={(event) => setNewExerciseUnit(event.target.value as ExerciseUnit)} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-purple-400">
                  <option value="kg">kg</option>
                  <option value="lbs">lbs</option>
                  <option value="bodyweight">Bodyweight</option>
                </select>
                <button type="button" onClick={handleAddAdHocExercise} className={primaryButtonClass}>
                  Add
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowAddExercise(true)} className="rounded-xl border border-dashed border-slate-700 px-4 py-3 text-sm text-slate-400 transition hover:border-purple-400/50 hover:text-white">
                + Add Exercise
              </button>
            )}

            <div className="flex flex-wrap justify-center gap-3 pb-4">
              <button type="button" onClick={handleFinishWorkout} className={primaryButtonClass}>
                Finish Workout
              </button>
              <button type="button" onClick={discardSession} className={dangerButtonClass}>
                Discard
              </button>
              <button type="button" onClick={minimize} className={quietButtonClass}>
                Minimize
              </button>
            </div>
          </>
        )}
      </div>

      {pendingQuest ? (
        <QuestCompletionModal
          questTitle={pendingQuest.title}
          goal={pendingGoal}
          progressValue={progressValue}
          onChange={setProgressValue}
          onCancel={cancelQuestCompletion}
          onConfirm={handleConfirmFromModal}
        />
      ) : null}
    </div>
  );
}
