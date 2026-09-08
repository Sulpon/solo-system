"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { Note, NoteCategory } from "../types/note";

function generateNoteId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "note-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export type NoteDraft = Readonly<{
  title: string;
  content: string;
  category?: NoteCategory;
  tags?: ReadonlyArray<string>;
}>;

export function useNotes() {
  const [notes, setNotes, hasLoaded] = useLocalStorageState<Note[]>(STORAGE_KEYS.notes, []);

  const addNote = useCallback(
    (draft: NoteDraft) => {
      const now = new Date().toISOString();
      const note: Note = {
        id: generateNoteId(),
        title: draft.title,
        content: draft.content,
        category: draft.category,
        tags: draft.tags,
        pinned: false,
        archived: false,
        createdAt: now,
        updatedAt: now,
      };

      setNotes((current) => [note, ...current]);
      return note;
    },
    [setNotes],
  );

  // A full draft is always passed (see NoteEditor) - every NoteDraft key
  // (including one explicitly set to undefined, e.g. a cleared category) is
  // present on the object, so the spread below reliably overwrites it rather
  // than leaving the old value in place.
  const updateNote = useCallback(
    (id: string, draft: NoteDraft) => {
      setNotes((current) => current.map((note) => (note.id === id ? { ...note, ...draft, updatedAt: new Date().toISOString() } : note)));
    },
    [setNotes],
  );

  const deleteNote = useCallback(
    (id: string) => {
      setNotes((current) => current.filter((note) => note.id !== id));
    },
    [setNotes],
  );

  const setPinned = useCallback(
    (id: string, pinned: boolean) => {
      setNotes((current) => current.map((note) => (note.id === id ? { ...note, pinned, updatedAt: new Date().toISOString() } : note)));
    },
    [setNotes],
  );

  const setArchived = useCallback(
    (id: string, archived: boolean) => {
      setNotes((current) => current.map((note) => (note.id === id ? { ...note, archived, updatedAt: new Date().toISOString() } : note)));
    },
    [setNotes],
  );

  return { notes, addNote, updateNote, deleteNote, setPinned, setArchived, hasLoaded } as const;
}
