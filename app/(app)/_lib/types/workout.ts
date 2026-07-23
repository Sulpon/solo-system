export type ExerciseUnit = "kg" | "lbs" | "bodyweight";

// Per-set modifier, only meaningful when the exercise's unit is "bodyweight".
export type BodyweightMode = "bodyweight" | "weighted" | "assisted";

export type TemplateExercise = Readonly<{
  id: string;
  name: string;
  unit: ExerciseUnit;
  // Free-text, user-entered - no fixed muscle taxonomy. Powers the Muscle
  // Group Distribution widget without hardcoding a muscle list.
  muscleGroup?: string;
  notes?: string;
  // One target rep count per planned set, in order (e.g. [10, 8, 8] for a
  // drop-off scheme) - set count is simply this array's length.
  targetReps: ReadonlyArray<number>;
  restSeconds: number;
  order: number;
}>;

// A remembered exercise definition, upserted whenever the user names an
// exercise (in a template or ad-hoc during logging) so it can be picked from
// a dropdown next time instead of retyped.
export type ExerciseLibraryEntry = Readonly<{
  id: string;
  name: string;
  unit: ExerciseUnit;
  muscleGroup?: string;
}>;

export type WorkoutTemplate = Readonly<{
  id: string;
  title: string;
  description?: string;
  exercises: ReadonlyArray<TemplateExercise>;
  createdAt: string;
  updatedAt: string;
}>;

export type SetLog = Readonly<{
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  unit: ExerciseUnit;
  bodyweightMode?: BodyweightMode;
  rpe?: number;
  notes?: string;
  completedAt: string;
}>;

// Input for creating or patching a single set - each set is independently
// editable (weight, reps, RPE) since actual performance varies set to set.
export type SetInput = Readonly<{
  weight: number;
  reps: number;
  unit?: ExerciseUnit;
  bodyweightMode?: BodyweightMode;
  rpe?: number;
  notes?: string;
}>;

export type ExerciseLog = Readonly<{
  id: string;
  name: string;
  unit: ExerciseUnit;
  muscleGroup?: string;
  // null/undefined = ad-hoc, logged outside any template.
  templateExerciseId?: string | null;
  sets: ReadonlyArray<SetLog>;
  order: number;
}>;

export type PersonalRecordType = "max_weight" | "max_volume" | "max_reps" | "longest_session" | "most_sets" | "best_estimated_1rm";

export type PersonalRecordEvent = Readonly<{
  id: string;
  type: PersonalRecordType;
  // Absent for session-level records (longest_session, most_sets).
  exerciseName?: string;
  value: number;
  unit?: string;
  sessionId: string;
  achievedAt: string;
}>;

export type WorkoutSession = Readonly<{
  id: string;
  templateId?: string | null;
  // Snapshot of the template title at completion time - survives template edits/deletes.
  templateTitle?: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  exerciseLogs: ReadonlyArray<ExerciseLog>;
  totalVolume: number;
  estimatedCalories?: number;
  personalRecordsAchieved: ReadonlyArray<PersonalRecordEvent>;
  notes?: string;
  linkedQuestId?: string | null;
}>;

export type WorkoutRestTimer = Readonly<{
  exerciseLogId: string;
  endsAt: string;
}>;

// The single in-progress session, if any - device-local, non-synced (see
// WORKOUT_ACTIVE_SESSION_KEY in storage-keys.ts), same role as FocusSession.
export type WorkoutActiveSession = Readonly<{
  id: string;
  templateId: string | null;
  templateTitle: string | null;
  startedAt: string;
  exerciseLogs: ReadonlyArray<ExerciseLog>;
  restTimer: WorkoutRestTimer | null;
  linkedQuestId: string | null;
  notes?: string;
}>;
