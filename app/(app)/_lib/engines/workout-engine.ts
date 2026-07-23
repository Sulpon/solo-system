import { getLocalDayKey } from "../local-day";
import type { BodyweightEntry } from "../types/bodyweight";
import type { ExerciseLog, PersonalRecordEvent, PersonalRecordType, SetLog, WorkoutActiveSession, WorkoutSession } from "../types/workout";

// ---------------------------------------------------------------------------
// Live timer math
// ---------------------------------------------------------------------------

export function getElapsedSeconds(session: WorkoutActiveSession, referenceDate: Date = new Date()): number {
  return Math.max(0, Math.floor((referenceDate.getTime() - new Date(session.startedAt).getTime()) / 1000));
}

export function getRestRemainingSeconds(session: WorkoutActiveSession, referenceDate: Date = new Date()): number {
  if (!session.restTimer) {
    return 0;
  }

  return Math.max(0, Math.floor((new Date(session.restTimer.endsAt).getTime() - referenceDate.getTime()) / 1000));
}

// ---------------------------------------------------------------------------
// Volume + 1RM
// ---------------------------------------------------------------------------

export function calculateSetVolume(set: Pick<SetLog, "weight" | "reps" | "bodyweightMode">) {
  if (set.bodyweightMode === "bodyweight" && set.weight <= 0) {
    return 0;
  }

  return Math.max(0, set.weight) * Math.max(0, set.reps);
}

export function calculateSessionVolume(exerciseLogs: ReadonlyArray<ExerciseLog>) {
  return exerciseLogs.reduce((total, log) => total + log.sets.reduce((sum, set) => sum + calculateSetVolume(set), 0), 0);
}

// Epley formula - a standard, widely used estimate; only meaningful for reps <= ~12.
export function estimateOneRepMax(weight: number, reps: number) {
  if (weight <= 0 || reps <= 0) {
    return 0;
  }

  return weight * (1 + reps / 30);
}

// ---------------------------------------------------------------------------
// Personal records
// ---------------------------------------------------------------------------

function priorMaxByExercise(sessions: ReadonlyArray<WorkoutSession>, scorer: (log: ExerciseLog) => number) {
  const maxByName = new Map<string, number>();

  for (const session of sessions) {
    for (const log of session.exerciseLogs) {
      const value = scorer(log);
      const current = maxByName.get(log.name) ?? -Infinity;

      if (value > current) {
        maxByName.set(log.name, value);
      }
    }
  }

  return maxByName;
}

function exerciseLogMaxWeight(log: ExerciseLog) {
  return log.sets.reduce((max, set) => Math.max(max, set.weight), 0);
}

function exerciseLogVolume(log: ExerciseLog) {
  return log.sets.reduce((sum, set) => sum + calculateSetVolume(set), 0);
}

function exerciseLogMaxReps(log: ExerciseLog) {
  return log.sets.reduce((max, set) => Math.max(max, set.reps), 0);
}

function exerciseLogBest1RM(log: ExerciseLog) {
  return log.sets.reduce((max, set) => Math.max(max, estimateOneRepMax(set.weight, set.reps)), 0);
}

function prId(type: PersonalRecordType, sessionId: string, exerciseName?: string) {
  return [type, sessionId, exerciseName ?? ""].join(":");
}

export function detectPersonalRecords(session: WorkoutSession, priorSessions: ReadonlyArray<WorkoutSession>): PersonalRecordEvent[] {
  const records: PersonalRecordEvent[] = [];
  const priorMaxWeight = priorMaxByExercise(priorSessions, exerciseLogMaxWeight);
  const priorMaxVolume = priorMaxByExercise(priorSessions, exerciseLogVolume);
  const priorMaxReps = priorMaxByExercise(priorSessions, exerciseLogMaxReps);
  const priorBest1RM = priorMaxByExercise(priorSessions, exerciseLogBest1RM);

  for (const log of session.exerciseLogs) {
    if (log.sets.length === 0) {
      continue;
    }

    const maxWeight = exerciseLogMaxWeight(log);
    if (maxWeight > (priorMaxWeight.get(log.name) ?? 0)) {
      records.push({ id: prId("max_weight", session.id, log.name), type: "max_weight", exerciseName: log.name, value: maxWeight, unit: log.unit, sessionId: session.id, achievedAt: session.endedAt });
    }

    const volume = exerciseLogVolume(log);
    if (volume > (priorMaxVolume.get(log.name) ?? 0)) {
      records.push({ id: prId("max_volume", session.id, log.name), type: "max_volume", exerciseName: log.name, value: volume, unit: log.unit, sessionId: session.id, achievedAt: session.endedAt });
    }

    const maxReps = exerciseLogMaxReps(log);
    if (maxReps > (priorMaxReps.get(log.name) ?? 0)) {
      records.push({ id: prId("max_reps", session.id, log.name), type: "max_reps", exerciseName: log.name, value: maxReps, unit: "reps", sessionId: session.id, achievedAt: session.endedAt });
    }

    const best1RM = exerciseLogBest1RM(log);
    if (best1RM > (priorBest1RM.get(log.name) ?? 0)) {
      records.push({ id: prId("best_estimated_1rm", session.id, log.name), type: "best_estimated_1rm", exerciseName: log.name, value: Math.round(best1RM * 10) / 10, unit: log.unit, sessionId: session.id, achievedAt: session.endedAt });
    }
  }

  const priorLongestSession = priorSessions.reduce((max, item) => Math.max(max, item.durationSeconds), 0);
  if (session.durationSeconds > priorLongestSession) {
    records.push({ id: prId("longest_session", session.id), type: "longest_session", value: session.durationSeconds, unit: "seconds", sessionId: session.id, achievedAt: session.endedAt });
  }

  const sessionSetCount = session.exerciseLogs.reduce((sum, log) => sum + log.sets.length, 0);
  const priorMostSets = priorSessions.reduce((max, item) => Math.max(max, item.exerciseLogs.reduce((sum, log) => sum + log.sets.length, 0)), 0);
  if (sessionSetCount > priorMostSets) {
    records.push({ id: prId("most_sets", session.id), type: "most_sets", value: sessionSetCount, unit: "sets", sessionId: session.id, achievedAt: session.endedAt });
  }

  return records;
}

// ---------------------------------------------------------------------------
// Exercise history / progression
// ---------------------------------------------------------------------------

export type ExerciseHistoryPoint = Readonly<{
  sessionId: string;
  date: string;
  maxWeight: number;
  volume: number;
  maxReps: number;
  estimated1RM: number;
}>;

export function getExerciseHistory(sessions: ReadonlyArray<WorkoutSession>, exerciseName: string): ExerciseHistoryPoint[] {
  return sessions
    .map((session) => {
      const log = session.exerciseLogs.find((item) => item.name === exerciseName);

      if (!log || log.sets.length === 0) {
        return null;
      }

      return {
        sessionId: session.id,
        date: session.endedAt,
        maxWeight: exerciseLogMaxWeight(log),
        volume: exerciseLogVolume(log),
        maxReps: exerciseLogMaxReps(log),
        estimated1RM: Math.round(exerciseLogBest1RM(log) * 10) / 10,
      };
    })
    .filter((point): point is ExerciseHistoryPoint => point !== null)
    .sort((first, second) => new Date(first.date).getTime() - new Date(second.date).getTime());
}

export function listLoggedExerciseNames(sessions: ReadonlyArray<WorkoutSession>) {
  const names = new Set<string>();
  sessions.forEach((session) => session.exerciseLogs.forEach((log) => names.add(log.name)));
  return Array.from(names).sort((first, second) => first.localeCompare(second));
}

export function getBestEstimated1RM(sessions: ReadonlyArray<WorkoutSession>, exerciseName: string) {
  const history = getExerciseHistory(sessions, exerciseName);
  return history.reduce((max, point) => Math.max(max, point.estimated1RM), 0);
}

export function getBestLifetimeLift(sessions: ReadonlyArray<WorkoutSession>) {
  let best: Readonly<{ exerciseName: string; estimated1RM: number }> | null = null;

  for (const name of listLoggedExerciseNames(sessions)) {
    const value = getBestEstimated1RM(sessions, name);

    if (!best || value > best.estimated1RM) {
      best = { exerciseName: name, estimated1RM: value };
    }
  }

  return best;
}

export function getMostImprovedExercise(sessions: ReadonlyArray<WorkoutSession>, recentCount = 3) {
  let best: Readonly<{ exerciseName: string; delta: number }> | null = null;

  for (const name of listLoggedExerciseNames(sessions)) {
    const history = getExerciseHistory(sessions, name);

    if (history.length < recentCount + 1) {
      continue;
    }

    const recent = history.slice(-recentCount);
    const previous = history.slice(-recentCount * 2, -recentCount);

    if (previous.length === 0) {
      continue;
    }

    const recentBest = Math.max(...recent.map((point) => point.estimated1RM));
    const previousBest = Math.max(...previous.map((point) => point.estimated1RM));
    const delta = recentBest - previousBest;

    if (!best || delta > best.delta) {
      best = { exerciseName: name, delta };
    }
  }

  return best;
}

export function getFavoriteExercise(sessions: ReadonlyArray<WorkoutSession>) {
  const setCountByName = new Map<string, number>();

  sessions.forEach((session) => {
    session.exerciseLogs.forEach((log) => {
      setCountByName.set(log.name, (setCountByName.get(log.name) ?? 0) + log.sets.length);
    });
  });

  let best: Readonly<{ exerciseName: string; setCount: number }> | null = null;

  for (const [exerciseName, setCount] of setCountByName.entries()) {
    if (!best || setCount > best.setCount) {
      best = { exerciseName, setCount };
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Volume / frequency ranges
// ---------------------------------------------------------------------------

function sessionsInRange(sessions: ReadonlyArray<WorkoutSession>, start: Date, end: Date) {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return sessions.filter((session) => {
    const time = new Date(session.endedAt).getTime();
    return time >= startTime && time <= endTime;
  });
}

function startOfWeek(referenceDate: Date) {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

export function getWeeklyVolume(sessions: ReadonlyArray<WorkoutSession>, referenceDate = new Date()) {
  const start = startOfWeek(referenceDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return sessionsInRange(sessions, start, end).reduce((sum, session) => sum + session.totalVolume, 0);
}

export function getMonthlyVolume(sessions: ReadonlyArray<WorkoutSession>, referenceDate = new Date()) {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59, 999);
  return sessionsInRange(sessions, start, end).reduce((sum, session) => sum + session.totalVolume, 0);
}

export function getYearlyVolume(sessions: ReadonlyArray<WorkoutSession>, referenceDate = new Date()) {
  const start = new Date(referenceDate.getFullYear(), 0, 1);
  const end = new Date(referenceDate.getFullYear(), 11, 31, 23, 59, 59, 999);
  return sessionsInRange(sessions, start, end).reduce((sum, session) => sum + session.totalVolume, 0);
}

export function getWeeklyVolumeBuckets(sessions: ReadonlyArray<WorkoutSession>, referenceDate = new Date()) {
  const values: number[] = [];

  for (let index = 3; index >= 0; index -= 1) {
    const weekStart = startOfWeek(referenceDate);
    weekStart.setDate(weekStart.getDate() - index * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    values.push(sessionsInRange(sessions, weekStart, weekEnd).reduce((sum, session) => sum + session.totalVolume, 0));
  }

  return values;
}

export function getTrainingFrequency(sessions: ReadonlyArray<WorkoutSession>, days: number, referenceDate = new Date()) {
  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);
  const start = new Date(referenceDate);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return sessionsInRange(sessions, start, end).length;
}

// ---------------------------------------------------------------------------
// Session-level stats
// ---------------------------------------------------------------------------

export function getAverageSessionDurationSeconds(sessions: ReadonlyArray<WorkoutSession>) {
  if (sessions.length === 0) {
    return 0;
  }

  return Math.round(sessions.reduce((sum, session) => sum + session.durationSeconds, 0) / sessions.length);
}

export function getLongestSession(sessions: ReadonlyArray<WorkoutSession>) {
  return sessions.reduce((longest: WorkoutSession | null, session) => (!longest || session.durationSeconds > longest.durationSeconds ? session : longest), null);
}

export function getMostSetsSession(sessions: ReadonlyArray<WorkoutSession>) {
  return sessions.reduce((best: Readonly<{ session: WorkoutSession; setCount: number }> | null, session) => {
    const setCount = session.exerciseLogs.reduce((sum, log) => sum + log.sets.length, 0);
    return !best || setCount > best.setCount ? { session, setCount } : best;
  }, null);
}

export function getDaysSinceLastWorkout(sessions: ReadonlyArray<WorkoutSession>, referenceDate = new Date()) {
  if (sessions.length === 0) {
    return null;
  }

  const lastEndedAt = sessions.reduce((latest, session) => Math.max(latest, new Date(session.endedAt).getTime()), 0);
  const diffMs = referenceDate.getTime() - lastEndedAt;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function getAverageRestBetweenSessions(sessions: ReadonlyArray<WorkoutSession>) {
  if (sessions.length < 2) {
    return null;
  }

  const sorted = [...sessions].sort((first, second) => new Date(first.endedAt).getTime() - new Date(second.endedAt).getTime());
  let totalGapDays = 0;

  for (let index = 1; index < sorted.length; index += 1) {
    const gapMs = new Date(sorted[index].startedAt).getTime() - new Date(sorted[index - 1].endedAt).getTime();
    totalGapDays += Math.max(0, gapMs / (1000 * 60 * 60 * 24));
  }

  return totalGapDays / (sorted.length - 1);
}

export function getWorkoutStreak(sessions: ReadonlyArray<WorkoutSession>, referenceDate = new Date()) {
  const trainedDays = new Set(sessions.map((session) => getLocalDayKey(session.endedAt)));
  const currentDate = new Date(referenceDate);
  currentDate.setHours(0, 0, 0, 0);

  let streak = 0;

  while (trainedDays.has(getLocalDayKey(currentDate))) {
    streak += 1;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}

export function getTrainedDayBuckets(sessions: ReadonlyArray<WorkoutSession>, days: number, referenceDate = new Date()) {
  const start = new Date(referenceDate);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const trainedDays = new Set(sessions.map((session) => getLocalDayKey(session.endedAt)));
  const values: number[] = [];

  for (let index = 0; index < days; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    values.push(trainedDays.has(getLocalDayKey(date)) ? 1 : 0);
  }

  return values;
}

export function getVolumeDayBuckets(sessions: ReadonlyArray<WorkoutSession>, days: number, referenceDate = new Date()) {
  const start = new Date(referenceDate);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const volumeByDay = new Map<string, number>();
  sessions.forEach((session) => {
    const key = getLocalDayKey(session.endedAt);
    volumeByDay.set(key, (volumeByDay.get(key) ?? 0) + session.totalVolume);
  });

  const values: number[] = [];

  for (let index = 0; index < days; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    values.push(volumeByDay.get(getLocalDayKey(date)) ?? 0);
  }

  return values;
}

// ---------------------------------------------------------------------------
// Muscle group distribution
// ---------------------------------------------------------------------------

export function getMuscleGroupDistribution(sessions: ReadonlyArray<WorkoutSession>) {
  const setsByGroup = new Map<string, number>();

  sessions.forEach((session) => {
    session.exerciseLogs.forEach((log) => {
      const group = log.muscleGroup?.trim() || "Other";
      setsByGroup.set(group, (setsByGroup.get(group) ?? 0) + log.sets.length);
    });
  });

  const total = Math.max(1, Array.from(setsByGroup.values()).reduce((sum, value) => sum + value, 0));

  return Array.from(setsByGroup.entries())
    .map(([group, setCount]) => ({ group, setCount, percent: Math.round((setCount / total) * 100) }))
    .sort((first, second) => second.setCount - first.setCount);
}

// ---------------------------------------------------------------------------
// Calories (rough, optional estimate only)
// ---------------------------------------------------------------------------

// Rough MET-based heuristic for resistance training. Only ever computed when
// both a duration and a known bodyweight exist - otherwise callers should
// leave estimatedCalories undefined rather than showing a made-up number.
const RESISTANCE_TRAINING_MET = 5;

export function estimateCalories(durationSeconds: number, latestBodyweightKg: number | null | undefined) {
  if (!latestBodyweightKg || latestBodyweightKg <= 0 || durationSeconds <= 0) {
    return undefined;
  }

  const hours = durationSeconds / 3600;
  return Math.round(RESISTANCE_TRAINING_MET * latestBodyweightKg * hours);
}

// ---------------------------------------------------------------------------
// Bodyweight
// ---------------------------------------------------------------------------

const LBS_PER_KG = 2.2046226218;

export function toKilograms(weight: number, unit: "kg" | "lbs") {
  return unit === "kg" ? weight : weight / LBS_PER_KG;
}

export function getLatestBodyweightKg(entries: ReadonlyArray<BodyweightEntry>) {
  if (entries.length === 0) {
    return null;
  }

  const latest = [...entries].sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())[0];
  return toKilograms(latest.weight, latest.unit);
}

export function getWeightTrend(entries: ReadonlyArray<BodyweightEntry>, count = 8) {
  return [...entries]
    .sort((first, second) => new Date(first.date).getTime() - new Date(second.date).getTime())
    .slice(-count)
    .map((entry) => toKilograms(entry.weight, entry.unit));
}
