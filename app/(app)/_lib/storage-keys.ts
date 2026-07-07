export const STORAGE_KEYS = {
  dashboardLayout: "menace-dashboard-layout",
  dashboardGridLayout: "menace-dashboard-grid-layout",
  questList: "menace-quest-list",
  questCompletions: "menace-quest-completions",
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
