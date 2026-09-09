// A streak the user tracks themselves, with no underlying Quest - e.g. "Cold
// showers" or "Read before bed." Deliberately NOT required to link to a
// Quest (see the Dashboard Streaks spec) - this is real, user-entered source
// data, not a Dashboard display preference (compare types/dashboard-preferences.ts,
// which only ever stores which streaks are VISIBLE, never their values).
export type ManualStreak = Readonly<{
  id: string;
  title: string;
  description?: string;
  currentStreak: number;
  createdAt: string;
  updatedAt: string;
}>;
