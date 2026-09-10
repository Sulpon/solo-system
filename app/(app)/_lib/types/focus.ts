// "quest-execution" is the mode used by the TAKE QUEST flow (see
// QuestExecutionControl.tsx / FocusOverlay.tsx) - unlike every other mode,
// it has no predefined duration and always displays elapsed time, never a
// countdown. It still uses this same FocusSession/activeSession machinery
// (single active session, pause/resume, timestamp-derived elapsed time,
// history) rather than a second competing timer system.
export type FocusMode = "custom" | "pomodoro" | "deep-work" | "90-min" | "quest-execution";

export const FOCUS_MODE_MINUTES: Readonly<Record<Exclude<FocusMode, "custom" | "quest-execution">, number>> = {
  pomodoro: 25,
  "deep-work": 50,
  "90-min": 90,
};

export const FOCUS_MODE_LABELS: Readonly<Record<FocusMode, string>> = {
  custom: "Custom",
  pomodoro: "Pomodoro",
  "deep-work": "Deep Work",
  "90-min": "90 Minute Session",
  "quest-execution": "Quest Focus",
};

// quest-execution sessions have no predefined duration - this is a
// generous ceiling stored as the session's `durationSeconds` purely so the
// existing countdown-based "timed out" detection in focus-store.tsx never
// fires in practice. No UI for this mode ever displays remaining/countdown
// time - always elapsed (see FocusOverlay.tsx/FocusTimer.tsx's "elapsed"
// mode), so this number itself is never shown to the user.
export const QUEST_EXECUTION_DURATION_SECONDS = 60 * 60 * 24;

// The single in-progress session, if any. Stored under a non-"menace-"
// prefixed key so it is intentionally invisible to the cloud snapshot sync
// (which sweeps every "menace-*" key) - only finished sessions in
// FocusHistory are ever synced.
export type FocusSession = Readonly<{
  id: string;
  mode: FocusMode;
  durationSeconds: number;
  startedAt: string;
  pausedAt: string | null;
  totalPausedMs: number;
  linkedQuestId: string | null;
  linkedGoalId: string | null;
  linkedDreamId: string | null;
  // Set when the user clicks "End Session" mid-run, so the completion
  // prompt shows without the "Continue Working" option. Timer completing
  // naturally at zero does not set this.
  manuallyEnded: boolean;
}>;

export type FocusHistoryEntry = Readonly<{
  id: string;
  start: string;
  end: string;
  duration: number;
  mode: FocusMode;
  linkedQuestId: string | null;
  linkedGoalId: string | null;
  linkedDreamId: string | null;
  completedQuest: boolean;
  interrupted: boolean;
  // Reused as the TAKE QUEST feedback form's optional "what made this
  // easier or harder" note - no separate field needed.
  notes?: string;
  // Post-Quest feedback (TAKE QUEST / FINISH QUEST flow only) - see
  // QuestFinishFeedback.tsx. All optional and absent on every history
  // entry created before this existed, and on every entry from a session
  // started the ordinary way (FocusButton/StartFocusModal), which never
  // collects this. Scales are whatever the feedback form uses (currently
  // 1-10); never interpreted numerically by any existing system.
  energyBefore?: number;
  energyAfter?: number;
  focusDifficulty?: number;
  taskDifficulty?: number;
  // A snapshot of the linked Quest's checklist progress at FINISH QUEST
  // time - purely a historical record for future analytics, never itself a
  // source of truth (the Quest's own `checklist` field remains that, and
  // Minimum/Full status is always recomputed live from it - see
  // checklist-engine.ts's getChecklistProgress).
  checklistMinimumSuccessReached?: boolean;
  checklistFullCompletionReached?: boolean;
  checklistMinimumTotal?: number;
  checklistMinimumCompleted?: number;
  checklistFullTotal?: number;
  checklistFullCompleted?: number;
}>;
