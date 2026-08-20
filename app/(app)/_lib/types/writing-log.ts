// A Writing Log Entry records pages written on a specific day - the
// thesis's primary, real-output progress metric (never converted to XP).
// Multiple entries can exist for the same day (e.g. a morning and evening
// session); totals are summed per day rather than overwritten.

export type WritingLogEntry = Readonly<{
  id: string;
  date: string; // local day key, "YYYY-MM-DD"
  pages: number;
  createdAt: string;
}>;

export function createWritingLogId() {
  return `writing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
