import type { Note } from "../types/note";

// Isolated behind one function so a future semantic-search implementation
// can replace the body without touching any caller.
export function searchNotes(query: string, notes: ReadonlyArray<Note>): ReadonlyArray<Note> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return notes;
  }

  return notes.filter((note) => {
    if (note.title.toLowerCase().includes(trimmed) || note.content.toLowerCase().includes(trimmed)) {
      return true;
    }

    return (note.tags ?? []).some((tag) => tag.toLowerCase().includes(trimmed));
  });
}

export function getAllTags(notes: ReadonlyArray<Note>): ReadonlyArray<string> {
  const tags = new Set<string>();
  for (const note of notes) {
    for (const tag of note.tags ?? []) {
      tags.add(tag);
    }
  }
  return Array.from(tags).sort((a, b) => a.localeCompare(b));
}
