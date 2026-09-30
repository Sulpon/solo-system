"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { applyStatusChange, sanitizeMediaItem } from "../engines/library-engine";
import { createAttachmentId } from "../types/attachment";
import { deleteDocumentFile, putDocumentFile } from "../document-store";
import type { EntityAttachment } from "../types/attachment";
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
  // Synced in an effect, not assigned during render - matches useGoalTree's
  // own goalTreeRef pattern, and writing a ref mid-render is exactly what
  // react-hooks/refs forbids. deleteItem needs it so it can find the blobs
  // an item owned without taking a dependency on the whole list.
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

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

  // Deleting an item also drops the IndexedDB blobs it owned - its
  // attachments and its cover image. Without this the bytes stay in the
  // browser forever with nothing left referencing them, since the id that
  // found them lived only on the row being removed. Best-effort: a failed
  // blob delete must not block removing the item the user asked to delete.
  const deleteItem = useCallback(
    (id: string) => {
      const target = itemsRef.current.find((item) => item.id === id);

      if (target) {
        const blobIds = [...(target.attachments ?? []).map((attachment) => attachment.id), ...(target.coverImageId ? [target.coverImageId] : [])];
        void Promise.all(blobIds.map((blobId) => deleteDocumentFile(blobId).catch(() => undefined)));
      }

      setItems((current) => current.filter((item) => item.id !== id));
    },
    [setItems],
  );

  // Writes the bytes to IndexedDB first, then records the metadata: if a
  // write fails, nothing is added to the item, so there is never a row
  // pointing at a blob that was never stored.
  const addAttachments = useCallback(
    async (id: string, files: ReadonlyArray<File>) => {
      const uploaded: EntityAttachment[] = await Promise.all(
        files.map(async (file) => {
          const attachmentId = createAttachmentId("library-file");
          await putDocumentFile(attachmentId, file);
          return { id: attachmentId, fileName: file.name, fileType: file.type, fileSize: file.size, uploadedAt: new Date().toISOString() };
        }),
      );

      setItems((current) => current.map((item) => (item.id === id ? { ...item, attachments: [...(item.attachments ?? []), ...uploaded], updatedAt: new Date().toISOString() } : item)));
    },
    [setItems],
  );

  // Drops the metadata row only - AttachmentsPanel has already removed the
  // blob by the time this runs.
  const removeAttachment = useCallback(
    (id: string, attachmentId: string) => {
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, attachments: (item.attachments ?? []).filter((attachment) => attachment.id !== attachmentId), updatedAt: new Date().toISOString() } : item)),
      );
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
    addAttachments,
    removeAttachment,
  } as const;
}
