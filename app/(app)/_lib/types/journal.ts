// The only new persisted data Chronicle introduces. Everything else Chronicle
// shows is derived live from existing Quest/Workout/XP/Achievement/Goal
// records (see engines/chronicle-engine.ts) - this type exists purely for
// what nothing else already captures: the user's own written memory of a day.
export type JournalPhoto = Readonly<{
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}>;

export type DailyJournalEntry = Readonly<{
  id: string;
  // Local day key (YYYY-MM-DD), one entry per date - see getLocalDayKey.
  date: string;
  text: string;
  photos: ReadonlyArray<JournalPhoto>;
  tags?: ReadonlyArray<string>;
  createdAt: string;
  updatedAt: string;
}>;
