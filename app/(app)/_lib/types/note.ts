// Frictionless idea/thought capture - see the Notes architecture audit.
// Deliberately minimal: content is the only required field, everything else
// is optional so creation never demands more than "write and save."
export type NoteCategory = "idea" | "thought" | "research" | "project" | "trading" | "career" | "learning" | "life" | "content" | "other";

export const NOTE_CATEGORIES: ReadonlyArray<NoteCategory> = ["idea", "thought", "research", "project", "trading", "career", "learning", "life", "content", "other"];

// Polymorphic link to any other Atlas entity - architecture-only for now.
// Nothing reads or writes this field yet (no picker UI, per the Phase 1
// scope); it exists purely so the Note shape doesn't need to change when
// entity linking is built later.
export type NoteLinkEntityType = "goal" | "quest" | "challenge" | "country" | "city" | "dungeon" | "note";

export type NoteLink = Readonly<{
  id: string;
  entityType: NoteLinkEntityType;
  entityId: string;
}>;

export type Note = Readonly<{
  id: string;
  title: string;
  content: string;
  category?: NoteCategory;
  tags?: ReadonlyArray<string>;
  links?: ReadonlyArray<NoteLink>;
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}>;
