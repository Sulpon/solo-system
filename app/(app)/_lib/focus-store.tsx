"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocalStorageState } from "./hooks/use-local-storage-state";
import { useFocusHistory } from "./hooks/useFocusHistory";
import { FOCUS_ACTIVE_SESSION_KEY, FOCUS_MINIMIZED_KEY } from "./storage-keys";
import { getElapsedMs, getRemainingSeconds } from "./focus-stats";
import { FOCUS_MODE_MINUTES } from "./types/focus";
import type { FocusHistoryEntry, FocusMode, FocusSession } from "./types/focus";

// The subset of FocusHistoryEntry that a caller may supply on top of what
// finishSession already computes itself (duration/mode/linked ids/etc) -
// currently only the TAKE QUEST feedback flow uses this (see
// FocusOverlay.tsx); every existing finishSession(completedQuest) call site
// keeps working unchanged since this defaults to {}.
export type FocusFinishExtra = Partial<
  Pick<
    FocusHistoryEntry,
    | "notes"
    | "energyBefore"
    | "energyAfter"
    | "focusDifficulty"
    | "taskDifficulty"
    | "checklistMinimumSuccessReached"
    | "checklistFullCompletionReached"
    | "checklistMinimumTotal"
    | "checklistMinimumCompleted"
    | "checklistFullTotal"
    | "checklistFullCompleted"
  >
>;

export type StartFocusOptions = Readonly<{
  mode: FocusMode;
  durationSeconds: number;
  linkedQuestId?: string | null;
  linkedGoalId?: string | null;
  linkedDreamId?: string | null;
}>;

export type FocusStoreValue = Readonly<{
  activeSession: FocusSession | null;
  history: ReadonlyArray<FocusHistoryEntry>;
  remainingSeconds: number;
  // Timestamp-derived elapsed time (see getElapsedMs in focus-stats.ts) -
  // always available alongside remainingSeconds. Only "quest-execution"
  // mode's UI reads this for its main display (an indefinite session has
  // nothing meaningful to count down from); every other mode continues to
  // display remainingSeconds exactly as before.
  elapsedSeconds: number;
  isRunning: boolean;
  isMinimized: boolean;
  showCompletionPrompt: boolean;
  canContinueWorking: boolean;
  startSession: (options: StartFocusOptions) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  requestEndSession: () => void;
  extendSession: () => void;
  finishSession: (completedQuest: boolean, extra?: FocusFinishExtra) => void;
  minimize: () => void;
  expand: () => void;
}>;

const FocusContext = createContext<FocusStoreValue | null>(null);

function createId() {
  return `focus-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function playCompletionChime() {
  try {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    [523.25, 659.25].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      const start = now + index * 0.16;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.08, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.55);
    });

    window.setTimeout(() => void ctx.close(), 1200);
  } catch {
    // Audio isn't available in every environment (e.g. autoplay policies) - a
    // missed chime is not worth surfacing to the user.
  }
}

function notifySessionComplete(session: FocusSession) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }

  try {
    new Notification("Focus session complete", {
      body: session.linkedQuestId ? "Time's up. Did you finish?" : "Time's up.",
      silent: true,
    });
  } catch {
    // Notification construction can throw in some embedded contexts - safe to ignore.
  }
}

export function FocusProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [activeSession, setActiveSession] = useLocalStorageState<FocusSession | null>(FOCUS_ACTIVE_SESSION_KEY, null);
  const { history, addHistoryEntry } = useFocusHistory();
  const [isMinimized, setIsMinimized] = useLocalStorageState<boolean>(FOCUS_MINIMIZED_KEY, false);
  const [, forceTick] = useState(0);
  const hasFiredCompletionRef = useRef<string | null>(null);

  const remainingSeconds = activeSession ? getRemainingSeconds(activeSession) : 0;
  const elapsedSeconds = activeSession ? Math.floor(getElapsedMs(activeSession) / 1000) : 0;
  const isRunning = Boolean(activeSession && !activeSession.pausedAt);
  const timedOut = Boolean(activeSession) && remainingSeconds <= 0;
  const showCompletionPrompt = Boolean(activeSession) && (timedOut || Boolean(activeSession?.manuallyEnded));
  const canContinueWorking = timedOut && !activeSession?.manuallyEnded;

  // Ticks the countdown once a second while a session is actively running.
  // Remaining time is always derived from the stored startedAt timestamp, so
  // a throttled/backgrounded interval never desyncs the timer - it only
  // delays how promptly the UI (and the completion side effects below)
  // notice that time is already up.
  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = window.setInterval(() => forceTick((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        forceTick((value) => value + 1);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (!activeSession || !timedOut || activeSession.manuallyEnded) {
      return;
    }

    if (hasFiredCompletionRef.current === activeSession.id) {
      return;
    }

    hasFiredCompletionRef.current = activeSession.id;
    playCompletionChime();
    notifySessionComplete(activeSession);
  }, [activeSession, timedOut]);

  const startSession = useCallback(
    ({ mode, durationSeconds, linkedQuestId = null, linkedGoalId = null, linkedDreamId = null }: StartFocusOptions) => {
      setActiveSession((current) => {
        if (current) {
          return current;
        }

        if (typeof Notification !== "undefined" && Notification.permission === "default") {
          void Notification.requestPermission();
        }

        return {
          id: createId(),
          mode,
          durationSeconds,
          startedAt: new Date().toISOString(),
          pausedAt: null,
          totalPausedMs: 0,
          linkedQuestId,
          linkedGoalId,
          linkedDreamId,
          manuallyEnded: false,
        };
      });
      setIsMinimized(false);
    },
    [setActiveSession],
  );

  const pauseSession = useCallback(() => {
    setActiveSession((current) => (current && !current.pausedAt ? { ...current, pausedAt: new Date().toISOString() } : current));
  }, [setActiveSession]);

  const resumeSession = useCallback(() => {
    setActiveSession((current) => {
      if (!current || !current.pausedAt) {
        return current;
      }

      const pausedMs = Date.now() - new Date(current.pausedAt).getTime();
      return { ...current, pausedAt: null, totalPausedMs: current.totalPausedMs + pausedMs };
    });
  }, [setActiveSession]);

  const requestEndSession = useCallback(() => {
    setActiveSession((current) => (current ? { ...current, manuallyEnded: true } : current));
  }, [setActiveSession]);

  const extendSession = useCallback(() => {
    setActiveSession((current) => {
      if (!current) {
        return current;
      }

      const extensionSeconds = (current.mode === "custom" || current.mode === "quest-execution" ? 25 : FOCUS_MODE_MINUTES[current.mode]) * 60;
      hasFiredCompletionRef.current = null;
      return { ...current, durationSeconds: current.durationSeconds + extensionSeconds };
    });
  }, [setActiveSession]);

  const finishSession = useCallback(
    (completedQuest: boolean, extra: FocusFinishExtra = {}) => {
      if (!activeSession) {
        return;
      }

      const endIso = new Date().toISOString();
      // If time already ran out, count the full prescribed duration (not
      // however long the user lingered on the completion prompt). Otherwise
      // this was ended early, so count only the time actually spent. For
      // quest-execution sessions (no real target duration - see
      // QUEST_EXECUTION_DURATION_SECONDS), remainingSeconds is effectively
      // always positive for any realistic session length, so this already
      // reduces to the correct "durationSeconds - remainingSeconds ==
      // actual elapsed time" without any special-casing here.
      const actualDurationSeconds = remainingSeconds > 0 ? activeSession.durationSeconds - remainingSeconds : activeSession.durationSeconds;

      addHistoryEntry({
        id: activeSession.id,
        start: activeSession.startedAt,
        end: endIso,
        duration: Math.max(0, Math.round(actualDurationSeconds)),
        mode: activeSession.mode,
        linkedQuestId: activeSession.linkedQuestId,
        linkedGoalId: activeSession.linkedGoalId,
        linkedDreamId: activeSession.linkedDreamId,
        completedQuest,
        interrupted: activeSession.manuallyEnded,
        ...extra,
      });
      hasFiredCompletionRef.current = null;
      setActiveSession(null);
      setIsMinimized(false);
    },
    [activeSession, addHistoryEntry, remainingSeconds, setActiveSession],
  );

  const minimize = useCallback(() => setIsMinimized(true), []);
  const expand = useCallback(() => setIsMinimized(false), []);

  const value: FocusStoreValue = {
    activeSession,
    history,
    remainingSeconds,
    elapsedSeconds,
    isRunning,
    isMinimized,
    showCompletionPrompt,
    canContinueWorking,
    startSession,
    pauseSession,
    resumeSession,
    requestEndSession,
    extendSession,
    finishSession,
    minimize,
    expand,
  };

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocus() {
  const context = useContext(FocusContext);

  if (!context) {
    throw new Error("useFocus must be used within a FocusProvider");
  }

  return context;
}
