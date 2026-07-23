import { calculateSessionVolume, detectPersonalRecords, estimateCalories } from "./engines/workout-engine";
import { parseLocalDayKey } from "./local-day";
import type { ExerciseLog, ExerciseUnit, SetInput, SetLog, WorkoutActiveSession, WorkoutSession, WorkoutTemplate } from "./types/workout";

export function createWorkoutId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createSetLog(input: SetInput, setNumber: number, unit: ExerciseUnit): SetLog {
  return {
    id: createWorkoutId("set"),
    setNumber,
    weight: Math.max(0, input.weight),
    reps: Math.max(0, Math.floor(input.reps)),
    unit: input.unit ?? unit,
    bodyweightMode: input.bodyweightMode,
    rpe: input.rpe,
    notes: input.notes,
    completedAt: new Date().toISOString(),
  };
}

export function appendSetToLog(log: ExerciseLog, input: SetInput): ExerciseLog {
  return { ...log, sets: [...log.sets, createSetLog(input, log.sets.length + 1, log.unit)] };
}

// The default values for a freshly-appended set row. Mirrors the previous set
// in the exercise when one exists (typical straight-set training), otherwise
// falls back to the template's default reps - each row stays independently
// editable afterward since actual reps/weight can differ set to set.
export function createDefaultSetInput(log: ExerciseLog, templateDefaultReps?: number): SetInput {
  const lastSet = log.sets[log.sets.length - 1];

  return {
    weight: lastSet?.weight ?? 0,
    reps: lastSet?.reps ?? templateDefaultReps ?? 10,
    unit: log.unit,
    bodyweightMode: log.unit === "bodyweight" ? lastSet?.bodyweightMode ?? "bodyweight" : undefined,
  };
}

// Seeds one exercise log's sets straight from its template defaults (one row
// per planned set, each at that set's own target reps) so the user edits
// pre-existing rows instead of tapping "+ Set" repeatedly - each row is still
// independently editable, and untouched/unwanted rows or whole exercises can
// be removed before finishing.
export function createSeededExerciseLogs(template: WorkoutTemplate | null): ExerciseLog[] {
  if (!template) {
    return [];
  }

  return [...template.exercises]
    .sort((first, second) => first.order - second.order)
    .map((exercise) => {
      const targetReps = exercise.targetReps.length > 0 ? exercise.targetReps : [10];

      return {
        id: createWorkoutId("log"),
        name: exercise.name,
        unit: exercise.unit,
        muscleGroup: exercise.muscleGroup,
        templateExerciseId: exercise.id,
        order: exercise.order,
        sets: targetReps.map((reps, index) =>
          createSetLog({ weight: 0, reps, bodyweightMode: exercise.unit === "bodyweight" ? "bodyweight" : undefined }, index + 1, exercise.unit),
        ),
      };
    });
}

export function createAdHocExerciseLog(name: string, unit: ExerciseUnit, order: number, muscleGroup?: string): ExerciseLog {
  return {
    id: createWorkoutId("log"),
    name,
    unit,
    muscleGroup,
    templateExerciseId: null,
    order,
    sets: [createSetLog({ weight: 0, reps: 10, bodyweightMode: unit === "bodyweight" ? "bodyweight" : undefined }, 1, unit)],
  };
}

// Builds a finished session for a workout that already happened (e.g. "I
// forgot to log yesterday's session"), with no live timer involved. `date` is
// a local day key (YYYY-MM-DD); the session is timestamped using the current
// time-of-day on that date, mirroring how past-day quest completions are
// backdated in QuestManagerPage.
export function createWorkoutSessionFromManualEntry(
  options: Readonly<{
    date: string;
    durationMinutes: number;
    exerciseLogs: ReadonlyArray<ExerciseLog>;
    templateId?: string | null;
    templateTitle?: string;
    notes?: string;
  }>,
  priorSessions: ReadonlyArray<WorkoutSession>,
  latestBodyweightKg: number | null | undefined,
): WorkoutSession {
  const exerciseLogs = options.exerciseLogs.filter((log) => log.sets.length > 0);
  const now = new Date();
  const endedAtDate = parseLocalDayKey(options.date);
  endedAtDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  const durationSeconds = Math.max(0, Math.round(options.durationMinutes * 60));
  const startedAtDate = new Date(endedAtDate.getTime() - durationSeconds * 1000);
  const endedAt = endedAtDate.toISOString();
  const totalVolume = calculateSessionVolume(exerciseLogs);

  const draftSession: WorkoutSession = {
    id: createWorkoutId("workout"),
    templateId: options.templateId ?? null,
    templateTitle: options.templateTitle,
    startedAt: startedAtDate.toISOString(),
    endedAt,
    durationSeconds,
    exerciseLogs,
    totalVolume,
    estimatedCalories: estimateCalories(durationSeconds, latestBodyweightKg),
    personalRecordsAchieved: [],
    notes: options.notes,
    linkedQuestId: null,
  };

  return {
    ...draftSession,
    personalRecordsAchieved: detectPersonalRecords(draftSession, priorSessions),
  };
}

export function createWorkoutSessionFromActiveSession(
  active: WorkoutActiveSession,
  priorSessions: ReadonlyArray<WorkoutSession>,
  latestBodyweightKg: number | null | undefined,
  endedAt = new Date().toISOString(),
): WorkoutSession {
  const exerciseLogs = active.exerciseLogs.filter((log) => log.sets.length > 0);
  const durationSeconds = Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(active.startedAt).getTime()) / 1000));
  const totalVolume = calculateSessionVolume(exerciseLogs);

  const draftSession: WorkoutSession = {
    id: active.id,
    templateId: active.templateId,
    templateTitle: active.templateTitle ?? undefined,
    startedAt: active.startedAt,
    endedAt,
    durationSeconds,
    exerciseLogs,
    totalVolume,
    estimatedCalories: estimateCalories(durationSeconds, latestBodyweightKg),
    personalRecordsAchieved: [],
    notes: active.notes,
    linkedQuestId: active.linkedQuestId,
  };

  return {
    ...draftSession,
    personalRecordsAchieved: detectPersonalRecords(draftSession, priorSessions),
  };
}
