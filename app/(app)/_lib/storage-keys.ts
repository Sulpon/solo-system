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
  rewardCollection: "menace-reward-collection",
  realLifeRewards: "menace-real-life-rewards",
  bonusXpEvents: "menace-bonus-xp-events",
  journalEntries: "menace-journal-entries",
  worldMapSelectedGoalId: "menace-world-map-selected-goal-id",
  // AI Rival simulation state - synced via the cloud snapshot like everything
  // else under "menace-" so the world looks the same across devices. Kept
  // compact (incremental aggregates + capped logs, not unbounded completion
  // history) - see world-map/rival-world-store.ts.
  worldRivalState: "menace-world-rival-state",
  worldRivalEncounters: "menace-world-rival-encounters",
  worldRivalLastSimulatedAt: "menace-world-rival-last-simulated-at",
  // Per-city Dungeon/Boss progression - only ever written for a dungeon the
  // player has actually completed (locked/available are always derived live
  // from city progress, never stored). See engines/world-map-engine.ts.
  worldMapDungeonProgress: "menace-world-map-dungeon-progress",
  worldMapCityConquests: "menace-world-map-city-conquests",
  worldMapPosition: "menace-world-map-position",
  worldMapDiscoveredCountryIds: "menace-world-map-discovered-country-ids",
  // Player Character - real photos/measurements/wardrobe, see
  // types/player-character.ts. Each collection persists independently, same
  // as every other feature in this app - not one monolithic blob.
  characterReferencePhotos: "menace-character-reference-photos",
  wardrobeItems: "menace-wardrobe-items",
  hairstyles: "menace-hairstyles",
  characterEquippedItems: "menace-character-equipped-items",
  characterProfile: "menace-character-profile",
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
