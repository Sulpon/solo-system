// Atlas Library - a personal record of books, movies and series. One shared
// MediaItem model for all three (see engines/library-engine.ts for why a
// book can never end up "watching" and vice versa) rather than three
// separate storage systems, since they're structurally identical and only
// differ in a couple of labels.
export type MediaType = "book" | "movie" | "series";

export const MEDIA_TYPES: ReadonlyArray<MediaType> = ["book", "movie", "series"];

// "reading"/"watching" are both "currently consuming this" - kept as two
// distinct values (not one derived "in_progress" status) because the status
// filter chips need to show them separately (see section 16 of the spec),
// and because a book is never "watching" nor a movie "reading" - see
// getAvailableStatuses in library-engine.ts.
export type MediaStatus = "reading" | "watching" | "planned" | "finished" | "dropped";

export const MEDIA_STATUSES: ReadonlyArray<MediaStatus> = ["reading", "watching", "planned", "finished", "dropped"];

export type MediaItem = Readonly<{
  id: string;
  type: MediaType;
  title: string;
  creator?: string;
  year?: number;
  genres?: ReadonlyArray<string>;
  description?: string;
  // document-store.ts id (IndexedDB blob) - same pattern as every other
  // photo in this app (Character reference photos, Wardrobe items, CV
  // attachments). Only this small id lives in localStorage/the cloud
  // snapshot; the actual image bytes never leave this browser.
  coverImageId?: string;
  status: MediaStatus;
  // 1-5, integer. Absent means "not rated" - never defaults to a number.
  // This is the user's own rating - Atlas has no external rating source to
  // confuse it with (see section 10 of the spec).
  rating?: number;
  startedAt?: string;
  finishedAt?: string;
  // Description = information about the work (what it's about).
  // myDescription = the user's own interpretation, kept deliberately
  // separate and never auto-filled from one or the other.
  myDescription?: string;
  // Lessons/ideas/principles/quotes worth remembering - the seed for a
  // later, explicitly user-chosen Zettelkasten note. Never auto-converted
  // into one (see section 23 of the spec) - linkedNoteIds below is the only
  // bridge, and only when the user adds it themselves.
  whatILearned?: string;
  linkedGoalIds?: ReadonlyArray<string>;
  linkedSkillIds?: ReadonlyArray<string>;
  linkedNoteIds?: ReadonlyArray<string>;
  createdAt: string;
  updatedAt: string;
}>;
