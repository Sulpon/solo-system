// Frictionless idea/thought capture - see the Notes architecture audit.
// Deliberately minimal: content is the only required field, everything else
// is optional so creation never demands more than "write and save."
export type NoteCategory = "idea" | "thought" | "research" | "project" | "trading" | "career" | "learning" | "life" | "content" | "other";

export const NOTE_CATEGORIES: ReadonlyArray<NoteCategory> = ["idea", "thought", "research", "project", "trading", "career", "learning", "life", "content", "other"];

// Polymorphic link to any other Atlas entity. Now a real, working
// relationship (see _lib/relationships.ts and NoteLinkPicker) - Atlas OS
// Phase 4 built the first reader/writer for this field. "attribute" (a
// Skill) was added alongside that work specifically so Note<->Skill, one of
// Phase 4's explicitly-requested relationships, is representable the same
// way as Note<->Goal/Quest rather than needing a second link mechanism.
export type NoteLinkEntityType = "goal" | "quest" | "attribute" | "challenge" | "country" | "city" | "dungeon" | "note";

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
