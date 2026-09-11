"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { Note, NoteCategory, NoteLink } from "../types/note";

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

  // A separate mutation, same shape as setPinned/setArchived above - kept
  // out of NoteDraft/updateNote deliberately, so the create/edit form's
  // contract stays simple and link management (Atlas OS Phase 4) is its own
  // action, exactly like Library's linkedGoalIds/linkedSkillIds/
  // linkedNoteIds are managed outside MediaDraft too (see
  // LibraryLinkedGoals.tsx and its siblings).
  const addLink = useCallback(
    (id: string, link: Omit<NoteLink, "id">) => {
      setNotes((current) =>
        current.map((note) => {
          if (note.id !== id) {
            return note;
          }

          const nextLink: NoteLink = { ...link, id: generateNoteId() };
          return { ...note, links: [...(note.links ?? []), nextLink], updatedAt: new Date().toISOString() };
        }),
      );
    },
    [setNotes],
  );

  const removeLink = useCallback(
    (id: string, linkId: string) => {
      setNotes((current) =>
        current.map((note) => (note.id === id ? { ...note, links: (note.links ?? []).filter((link) => link.id !== linkId), updatedAt: new Date().toISOString() } : note)),
      );
    },
    [setNotes],
  );

  return { notes, addNote, updateNote, deleteNote, setPinned, setArchived, addLink, removeLink, hasLoaded } as const;
}
