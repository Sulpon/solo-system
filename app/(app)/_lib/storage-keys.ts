export const STORAGE_KEYS = {
  dashboardLayout: "menace-dashboard-layout",
  dashboardGridLayout: "menace-dashboard-grid-layout",
  questList: "menace-quest-list",
  questCompletions: "menace-quest-completions",
  questReflections: "menace-quest-reflections",
  goalTree: "menace-goal-tree",
  goalXpEvents: "menace-goal-xp-events",
  activityEvents: "menace-activity-events",
  dailySnapshots: "menace-daily-snapshots",
  appearance: "menace-appearance-settings",
  pageLayoutPrefix: "menace-page-layout",
  pageWidgetLayoutPrefix: "menace-page-widgets",
  attributes: "menace-attributes",
  onboardingCompleted: "menace-onboarding-completed",
  onboardingMigrated: "menace-onboarding-migrated",
  // Finished focus sessions - syncs to the cloud like everything else here.
  focusHistory: "menace-focus-history",
  workoutTemplates: "menace-workout-templates",
  workoutSessions: "menace-workout-sessions",
  bodyweightEntries: "menace-bodyweight-entries",
  // Exercises the user has created, remembered across templates and ad-hoc
  // logging so they can be picked from a dropdown instead of retyped.
  exerciseLibrary: "menace-exercise-library",
  careerVision: "menace-career-vision",
  educationEntries: "menace-education-entries",
  skillEntries: "menace-skill-entries",
  experienceEntries: "menace-experience-entries",
  companyEntries: "menace-company-entries",
  vacancyEntries: "menace-vacancy-entries",
  cvEntries: "menace-cv-entries",
  coverLetterEntries: "menace-cover-letter-entries",
  linkedInProfile: "menace-linkedin-profile",
  portfolioProfile: "menace-portfolio-profile",
  thesisDashboard: "menace-thesis-dashboard",
  experimentEntries: "menace-experiment-entries",
  researchNoteEntries: "menace-research-note-entries",
  findingEntries: "menace-finding-entries",
  resourceEntries: "menace-resource-entries",
  manuscriptChapters: "menace-manuscript-chapters",
  writingLogEntries: "menace-writing-log-entries",
  tradeLogEntries: "menace-trade-log-entries",
  challenges: "menace-challenges",
} as const;

export const MENACE_STORAGE_EVENT = "menace-local-storage-change";

// Deliberately NOT under the "menace-" prefix: the cloud snapshot sync sweeps
// every "menace-*" key indiscriminately, and an in-progress focus session is
// local, ephemeral, device-specific state that must never be synced or
// overwritten by another device's snapshot. Only the finished entries in
// STORAGE_KEYS.focusHistory are meant to travel to the cloud.
export const FOCUS_ACTIVE_SESSION_KEY = "atlas-focus-active-session";
// Whether the overlay is currently minimized to the TopBar pill - purely a
// local UI preference, same non-synced reasoning as the key above.
export const FOCUS_MINIMIZED_KEY = "atlas-focus-minimized";

// Same reasoning as the Focus session keys above: an in-progress workout is
// local, ephemeral, device-specific state that must never be synced or
// overwritten by another device's snapshot. Only finished sessions in
// STORAGE_KEYS.workoutSessions are meant to travel to the cloud.
export const WORKOUT_ACTIVE_SESSION_KEY = "atlas-workout-active-session";
export const WORKOUT_MINIMIZED_KEY = "atlas-workout-minimized";
