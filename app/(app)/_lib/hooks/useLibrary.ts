"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { applyStatusChange, sanitizeMediaItem } from "../engines/library-engine";
import type { MediaItem, MediaStatus, MediaType } from "../types/media-item";

function generateMediaId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "media-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export type MediaDraft = Readonly<{
  type: MediaType;
  title: string;
  creator?: string;
  year?: number;
  genres?: ReadonlyArray<string>;
  description?: string;
  coverImageId?: string;
  status: MediaStatus;
  rating?: number;
  startedAt?: string;
  finishedAt?: string;
  myDescription?: string;
  whatILearned?: string;
}>;

function dedupeIds(ids: ReadonlyArray<string>): ReadonlyArray<string> {
  return [...new Set(ids)];
}

export function useLibrary() {
  const [rawItems, setItems, hasLoaded] = useLocalStorageState<MediaItem[]>(STORAGE_KEYS.libraryItems, []);
  const items = useMemo(() => rawItems.map(sanitizeMediaItem), [rawItems]);

  const addItem = useCallback(
    (draft: MediaDraft) => {
      const now = new Date().toISOString();
      const item: MediaItem = { id: generateMediaId(), ...draft, createdAt: now, updatedAt: now };
      setItems((current) => [item, ...current]);
      return item;
    },
    [setItems],
  );

  // A full draft is always passed (see MediaForm), so this reliably
  // overwrites every field rather than leaving stale values in place -
  // same convention as useNotes.ts's updateNote.
  const updateItem = useCallback(
    (id: string, draft: MediaDraft) => {
      setItems((current) => current.map((item) => (item.id === id ? { ...item, ...draft, updatedAt: new Date().toISOString() } : item)));
    },
    [setItems],
  );

  const deleteItem = useCallback(
    (id: string) => {
      setItems((current) => current.filter((item) => item.id !== id));
    },
    [setItems],
  );

  const changeStatus = useCallback(
    (id: string, nextStatus: MediaStatus) => {
      setItems((current) => current.map((item) => (item.id === id ? applyStatusChange(item, nextStatus) : item)));
    },
    [setItems],
  );

  const setRating = useCallback(
    (id: string, rating: number | undefined) => {
      setItems((current) => current.map((item) => (item.id === id ? { ...item, rating, updatedAt: new Date().toISOString() } : item)));
    },
    [setItems],
  );

  const linkGoal = useCallback(
    (id: string, goalId: string) => {
      setItems((current) => current.map((item) => (item.id === id ? { ...item, linkedGoalIds: dedupeIds([...(item.linkedGoalIds ?? []), goalId]), updatedAt: new Date().toISOString() } : item)));
    },
    [setItems],
  );

  const unlinkGoal = useCallback(
    (id: string, goalId: string) => {
      setItems((current) => current.map((item) => (item.id === id ? { ...item, linkedGoalIds: (item.linkedGoalIds ?? []).filter((entry) => entry !== goalId), updatedAt: new Date().toISOString() } : item)));
    },
    [setItems],
  );

  const linkSkill = useCallback(
    (id: string, skillId: string) => {
      setItems((current) => current.map((item) => (item.id === id ? { ...item, linkedSkillIds: dedupeIds([...(item.linkedSkillIds ?? []), skillId]), updatedAt: new Date().toISOString() } : item)));
    },
    [setItems],
  );

  const unlinkSkill = useCallback(
    (id: string, skillId: string) => {
      setItems((current) => current.map((item) => (item.id === id ? { ...item, linkedSkillIds: (item.linkedSkillIds ?? []).filter((entry) => entry !== skillId), updatedAt: new Date().toISOString() } : item)));
    },
    [setItems],
  );

  const linkNote = useCallback(
    (id: string, noteId: string) => {
      setItems((current) => current.map((item) => (item.id === id ? { ...item, linkedNoteIds: dedupeIds([...(item.linkedNoteIds ?? []), noteId]), updatedAt: new Date().toISOString() } : item)));
    },
    [setItems],
  );

  const unlinkNote = useCallback(
    (id: string, noteId: string) => {
      setItems((current) => current.map((item) => (item.id === id ? { ...item, linkedNoteIds: (item.linkedNoteIds ?? []).filter((entry) => entry !== noteId), updatedAt: new Date().toISOString() } : item)));
    },
    [setItems],
  );

  return {
    items,
    hasLoaded,
    addItem,
    updateItem,
    deleteItem,
    changeStatus,
    setRating,
    linkGoal,
    unlinkGoal,
    linkSkill,
    unlinkSkill,
    linkNote,
    unlinkNote,
  } as const;
}
