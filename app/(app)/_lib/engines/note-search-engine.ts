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

    if ((note.tags ?? []).some((tag) => tag.toLowerCase().includes(trimmed))) {
      return true;
    }

    // Everything else the note actually carries. Searching for "youtube"
    // or "invoice.pdf" months later is the point of an inbox you dump
    // links and documents into, and neither lives in the body text.
    if (note.category?.toLowerCase().includes(trimmed)) {
      return true;
    }

    if (note.url?.toLowerCase().includes(trimmed)) {
      return true;
    }

    return (note.attachments ?? []).some((attachment) => attachment.fileName.toLowerCase().includes(trimmed));
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
