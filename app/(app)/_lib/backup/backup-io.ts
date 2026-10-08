"use client";

import { applyAtlasSnapshot, collectAtlasSnapshot } from "../atlas-snapshot";
import { getDocumentFile, listDocumentFileIds } from "../document-store";
import { attachmentsFileName, backupFileName, buildBackup, verifyBackup, type AtlasBackup, type AttachmentRecord, type VerificationResult } from "./atlas-backup";

// The browser half of the backup system: reads the real stores, writes real
// files, and restores. Kept separate from atlas-backup.ts so all the
// decision-making stays pure and testable and only the unavoidable
// localStorage/IndexedDB/DOM calls live here.

const APP_VERSION = "0.1.0";

export type AttachmentsPayload = Readonly<{
  backupVersion: number;
  createdAt: string;
  // id -> base64 bytes. A separate file from the main backup because
  // photos and PDFs would otherwise bloat the JSON people actually want to
  // read, and because the localStorage half is useful on its own.
  files: Readonly<Record<string, string>>;
}>;

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  // Chunked: String.fromCharCode(...bytes) on a multi-MB file blows the
  // argument limit and throws.
  const CHUNK = 0x8000;
  for (let index = 0; index < buffer.length; index += CHUNK) {
    binary += String.fromCharCode(...buffer.subarray(index, index + CHUNK));
  }
  return btoa(binary);
}

// Enumerates IndexedDB WITHOUT reading the bytes, so the UI can tell the
// user how many files and how many megabytes are involved before they
// decide whether to export them.
export async function listAttachmentRecords(): Promise<AttachmentRecord[]> {
  let ids: string[] = [];

  try {
    ids = await listDocumentFileIds();
  } catch {
    // An unavailable IndexedDB (private mode, blocked storage) must not
    // stop the localStorage backup - it is reported as zero attachments
    // and the caller surfaces that honestly.
    return [];
  }

  const records = await Promise.all(
    ids.map(async (id) => {
      const blob = await getDocumentFile(id).catch(() => undefined);
      return blob ? { id, byteSize: blob.size, contentType: blob.type || undefined } : { id, byteSize: 0 };
    }),
  );

  return records;
}

export type CreatedBackup = Readonly<{
  backup: AtlasBackup;
  attachments: AttachmentsPayload | null;
  verification: VerificationResult;
}>;

export async function createAtlasBackup(options: Readonly<{ includeAttachmentBytes: boolean }>): Promise<CreatedBackup> {
  const snapshot = collectAtlasSnapshot();
  const records = await listAttachmentRecords();

  let attachments: AttachmentsPayload | null = null;

  if (options.includeAttachmentBytes && records.length > 0) {
    const files: Record<string, string> = {};

    for (const record of records) {
      const blob = await getDocumentFile(record.id).catch(() => undefined);
      if (blob) files[record.id] = await blobToBase64(blob);
    }

    attachments = { backupVersion: 1, createdAt: new Date().toISOString(), files };
  }

  const exportedEverything = attachments !== null && Object.keys(attachments.files).length === records.length;

  const backup = buildBackup({
    snapshot,
    attachments: records,
    attachmentsExported: exportedEverything,
    origin: typeof window === "undefined" ? "unknown" : window.location.origin,
    appVersion: APP_VERSION,
  });

  // Verified immediately, against the object just built, so "backup
  // created" and "backup verified" are never two different claims.
  return { backup, attachments, verification: verifyBackup(backup) };
}

export function downloadJson(fileName: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadBackup(created: CreatedBackup, at: Date = new Date()): void {
  downloadJson(backupFileName(at), created.backup);

  if (created.attachments) {
    downloadJson(attachmentsFileName(at), created.attachments);
  }
}

export type ParsedBackupFile = Readonly<{ backup: AtlasBackup | null; verification: VerificationResult }>;

export async function readBackupFile(file: File): Promise<ParsedBackupFile> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return { backup: null, verification: { ok: false, issues: [{ severity: "error", message: "That file is not valid JSON." }] } };
  }

  const verification = verifyBackup(parsed);
  return { backup: verification.ok ? (parsed as AtlasBackup) : null, verification };
}

// Restore replaces the menace-* half of localStorage with the backup's.
//
// A safety copy of the CURRENT state is written to disk first, and a
// failure there aborts the restore - the user must never be able to lose
// what is on this device in order to get back what is in a file. The
// safety copy is a downloaded file rather than a second localStorage entry
// on purpose: duplicating the whole dataset in the same store is exactly
// how a quota failure turns into data loss.
export async function restoreAtlasBackup(backup: AtlasBackup): Promise<void> {
  const safety = await createAtlasBackup({ includeAttachmentBytes: false });
  downloadJson(`atlas-pre-restore-safety-${Date.now()}.json`, safety.backup);

  // "replace": a restore is the one place the user has explicitly asked
  // for local storage to MATCH the file, deletions included.
  applyAtlasSnapshot({ ...backup.localStorage }, "replace");
}
