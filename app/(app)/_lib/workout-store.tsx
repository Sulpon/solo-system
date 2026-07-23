"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocalStorageState } from "./hooks/use-local-storage-state";
import { useBodyweight } from "./hooks/useBodyweight";
import { useWorkoutSessions } from "./hooks/useWorkoutSessions";
import { useWorkoutTemplates } from "./hooks/useWorkoutTemplates";
import { useProgression } from "./hooks/useProgression";
import { createWorkoutActivityEvents } from "./activity-events";
import { getElapsedSeconds, getLatestBodyweightKg, getRestRemainingSeconds } from "./engines/workout-engine";
import { WORKOUT_ACTIVE_SESSION_KEY, WORKOUT_MINIMIZED_KEY } from "./storage-keys";
import { appendSetToLog, createAdHocExerciseLog, createSeededExerciseLogs, createWorkoutId, createWorkoutSessionFromActiveSession } from "./workout-storage";
import type { ExerciseUnit, SetInput, WorkoutActiveSession, WorkoutSession } from "./types/workout";

export type StartWorkoutOptions = Readonly<{
  templateId?: string | null;
  linkedQuestId?: string | null;
}>;

export type WorkoutStoreValue = Readonly<{
  activeSession: WorkoutActiveSession | null;
  sessions: ReadonlyArray<WorkoutSession>;
  elapsedSeconds: number;
  restRemainingSeconds: number;
  isMinimized: boolean;
  startSession: (options?: StartWorkoutOptions) => void;
  addAdHocExercise: (name: string, unit: ExerciseUnit, muscleGroup?: string) => void;
  removeExerciseLog: (exerciseLogId: string) => void;
  addSet: (exerciseLogId: string, input: SetInput) => void;
  updateSet: (exerciseLogId: string, setId: string, patch: Partial<SetInput>) => void;
  removeSet: (exerciseLogId: string, setId: string) => void;
  startRestTimer: (exerciseLogId: string, seconds: number) => void;
  clearRestTimer: () => void;
  setNotes: (notes: string) => void;
  finishSession: () => WorkoutSession | null;
  discardSession: () => void;
  minimize: () => void;
  expand: () => void;
}>;

const WorkoutContext = createContext<WorkoutStoreValue | null>(null);

function playRestCompleteChime() {
  try {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 740;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.45);
    window.setTimeout(() => void ctx.close(), 900);
  } catch {
    // Audio isn't available in every environment - a missed chime is not worth surfacing.
  }
}

export function WorkoutProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { templates } = useWorkoutTemplates();
  const { sessions, setSessions } = useWorkoutSessions();
  const { entries: bodyweightEntries } = useBodyweight();
  const { addActivityEvents } = useProgression();
  const [activeSession, setActiveSession] = useLocalStorageState<WorkoutActiveSession | null>(WORKOUT_ACTIVE_SESSION_KEY, null);
  const [isMinimized, setIsMinimized] = useLocalStorageState<boolean>(WORKOUT_MINIMIZED_KEY, false);
  const [, forceTick] = useState(0);
  const hasFiredRestChimeRef = useRef<string | null>(null);

  const elapsedSeconds = activeSession ? getElapsedSeconds(activeSession) : 0;
  const restRemainingSeconds = activeSession ? getRestRemainingSeconds(activeSession) : 0;

  useEffect(() => {
    if (!activeSession) {
      return;
    }

    const interval = window.setInterval(() => forceTick((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [activeSession]);

  useEffect(() => {
    if (!activeSession?.restTimer) {
      return;
    }

    if (restRemainingSeconds > 0) {
      return;
    }

    if (hasFiredRestChimeRef.current === activeSession.restTimer.exerciseLogId + activeSession.restTimer.endsAt) {
      return;
    }

    hasFiredRestChimeRef.current = activeSession.restTimer.exerciseLogId + activeSession.restTimer.endsAt;
    playRestCompleteChime();
  }, [activeSession?.restTimer, restRemainingSeconds]);

  const startSession = useCallback(
    ({ templateId = null, linkedQuestId = null }: StartWorkoutOptions = {}) => {
      setActiveSession((current) => {
        if (current) {
          return current;
        }

        const template = templateId ? templates.find((item) => item.id === templateId) ?? null : null;

        return {
          id: createWorkoutId("workout"),
          templateId: template?.id ?? null,
          templateTitle: template?.title ?? null,
          startedAt: new Date().toISOString(),
          exerciseLogs: createSeededExerciseLogs(template),
          restTimer: null,
          linkedQuestId,
        };
      });
      setIsMinimized(false);
    },
    [setActiveSession, setIsMinimized, templates],
  );

  const addAdHocExercise = useCallback(
    (name: string, unit: ExerciseUnit, muscleGroup?: string) => {
      const trimmed = name.trim();

      if (!trimmed) {
        return;
      }

      setActiveSession((current) => {
        if (!current) {
          return current;
        }

        const log = createAdHocExerciseLog(trimmed, unit, current.exerciseLogs.length, muscleGroup);
        return { ...current, exerciseLogs: [...current.exerciseLogs, log] };
      });
    },
    [setActiveSession],
  );

  const removeExerciseLog = useCallback(
    (exerciseLogId: string) => {
      setActiveSession((current) => (current ? { ...current, exerciseLogs: current.exerciseLogs.filter((log) => log.id !== exerciseLogId) } : current));
    },
    [setActiveSession],
  );

  const addSet = useCallback(
    (exerciseLogId: string, input: SetInput) => {
      setActiveSession((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          exerciseLogs: current.exerciseLogs.map((log) => (log.id === exerciseLogId ? appendSetToLog(log, input) : log)),
        };
      });
    },
    [setActiveSession],
  );

  const updateSet = useCallback(
    (exerciseLogId: string, setId: string, patch: Partial<SetInput>) => {
      setActiveSession((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          exerciseLogs: current.exerciseLogs.map((log) =>
            log.id !== exerciseLogId
              ? log
              : {
                  ...log,
                  sets: log.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)),
                },
          ),
        };
      });
    },
    [setActiveSession],
  );

  const removeSet = useCallback(
    (exerciseLogId: string, setId: string) => {
      setActiveSession((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          exerciseLogs: current.exerciseLogs.map((log) =>
            log.id !== exerciseLogId
              ? log
              : { ...log, sets: log.sets.filter((set) => set.id !== setId).map((set, index) => ({ ...set, setNumber: index + 1 })) },
          ),
        };
      });
    },
    [setActiveSession],
  );

  const startRestTimer = useCallback(
    (exerciseLogId: string, seconds: number) => {
      hasFiredRestChimeRef.current = null;
      setActiveSession((current) => (current ? { ...current, restTimer: { exerciseLogId, endsAt: new Date(Date.now() + seconds * 1000).toISOString() } } : current));
    },
    [setActiveSession],
  );

  const clearRestTimer = useCallback(() => {
    setActiveSession((current) => (current ? { ...current, restTimer: null } : current));
  }, [setActiveSession]);

  const setNotes = useCallback(
    (notes: string) => {
      setActiveSession((current) => (current ? { ...current, notes } : current));
    },
    [setActiveSession],
  );

  const finishSession = useCallback((): WorkoutSession | null => {
    if (!activeSession) {
      return null;
    }

    const latestBodyweightKg = getLatestBodyweightKg(bodyweightEntries);
    const session = createWorkoutSessionFromActiveSession(activeSession, sessions, latestBodyweightKg);

    setSessions((current) => [...current, session]);
    addActivityEvents(createWorkoutActivityEvents(session));
    setActiveSession(null);
    setIsMinimized(false);

    return session;
  }, [activeSession, addActivityEvents, bodyweightEntries, sessions, setActiveSession, setIsMinimized, setSessions]);

  const discardSession = useCallback(() => {
    setActiveSession(null);
    setIsMinimized(false);
  }, [setActiveSession, setIsMinimized]);

  const minimize = useCallback(() => setIsMinimized(true), [setIsMinimized]);
  const expand = useCallback(() => setIsMinimized(false), [setIsMinimized]);

  const value: WorkoutStoreValue = {
    activeSession,
    sessions,
    elapsedSeconds,
    restRemainingSeconds,
    isMinimized,
    startSession,
    addAdHocExercise,
    removeExerciseLog,
    addSet,
    updateSet,
    removeSet,
    startRestTimer,
    clearRestTimer,
    setNotes,
    finishSession,
    discardSession,
    minimize,
    expand,
  };

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkout() {
  const context = useContext(WorkoutContext);

  if (!context) {
    throw new Error("useWorkout must be used within a WorkoutProvider");
  }

  return context;
}
