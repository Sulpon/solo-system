export type FocusMode = "custom" | "pomodoro" | "deep-work" | "90-min";

export const FOCUS_MODE_MINUTES: Readonly<Record<Exclude<FocusMode, "custom">, number>> = {
  pomodoro: 25,
  "deep-work": 50,
  "90-min": 90,
};

export const FOCUS_MODE_LABELS: Readonly<Record<FocusMode, string>> = {
  custom: "Custom",
  pomodoro: "Pomodoro",
  "deep-work": "Deep Work",
  "90-min": "90 Minute Session",
};

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
  notes?: string;
}>;
