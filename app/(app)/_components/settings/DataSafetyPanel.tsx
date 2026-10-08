"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalStorageState } from "../../_lib/hooks/use-local-storage-state";
import Card from "../Card";
import { useCloudSync } from "../../_lib/hooks/useCloudSync";
import { createAtlasBackup, downloadBackup, listAttachmentRecords, readBackupFile, restoreAtlasBackup, type CreatedBackup } from "../../_lib/backup/backup-io";
import type { AtlasBackup, VerificationResult } from "../../_lib/backup/atlas-backup";

const LAST_BACKUP_KEY = "atlas-last-backup-at";

const buttonClass = "rounded-xl border border-[rgb(var(--atlas-accent,168_85_247)/0.45)] bg-[rgb(var(--atlas-accent,168_85_247)/0.12)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[rgb(var(--atlas-accent,168_85_247)/0.22)] disabled:cursor-not-allowed disabled:opacity-50";
const ghostClass = "atlas-muted rounded-xl border border-white/10 px-4 py-2 text-sm transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function IssueList({ verification }: Readonly<{ verification: VerificationResult }>) {
  if (verification.issues.length === 0) return null;

  return (
    <ul className="mt-2 space-y-1">
      {verification.issues.map((issue, index) => (
        <li key={index} className={"text-xs " + (issue.severity === "error" ? "text-rose-300" : "text-amber-200")}>
          {issue.severity === "error" ? "✕" : "!"} {issue.message}
        </li>
      ))}
    </ul>
  );
}

function Manifest({ backup }: Readonly<{ backup: AtlasBackup }>) {
  const present = backup.metadata.entityCounts.filter((entry) => entry.present);

  return (
    <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
      <p className="atlas-muted text-[0.62rem] font-semibold uppercase tracking-[0.22em]">Manifest</p>
      <p className="atlas-muted mt-1.5 text-xs">
        {new Date(backup.createdAt).toLocaleString()} · {backup.metadata.keyCount} keys · {formatBytes(backup.metadata.totalSize)} · {backup.metadata.attachmentCount} attachment
        {backup.metadata.attachmentCount === 1 ? "" : "s"} ({formatBytes(backup.metadata.attachmentBytes)})
      </p>
      <p className="atlas-muted mt-1 truncate text-[0.66rem]">Origin: {backup.origin}</p>

      <div className="mt-2.5 grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
        {present.map((entry) => (
          <div key={entry.key} className="flex items-baseline justify-between gap-2 text-xs">
            <span className="atlas-muted truncate">{entry.label}</span>
            <span className="shrink-0 text-white/90">{entry.count === null ? "set" : entry.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Data Safety: create a verified backup of everything on this device, and
// restore one.
//
// Deliberately sits beside the existing Cloud Sync panel rather than
// replacing it - backup is useful whether or not cloud sync is configured,
// and right now it is the ONLY copy of Atlas data that exists off this
// browser.
export default function DataSafetyPanel() {
  const { isCloudSyncAvailable, user, syncStatus, lastSyncedAt } = useCloudSync();

  const [attachmentCount, setAttachmentCount] = useState<number | null>(null);
  const [attachmentBytes, setAttachmentBytes] = useState(0);
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [created, setCreated] = useState<CreatedBackup | null>(null);
  // Reuses the app's own localStorage hook rather than reading in an
  // effect: it already handles the SSR-to-client load without a hydration
  // mismatch. Not a menace-* key, so it never enters the cloud snapshot.
  const [lastBackupAt, setLastBackupAt] = useLocalStorageState<string | null>(LAST_BACKUP_KEY, null);
  const [error, setError] = useState("");

  const [pendingRestore, setPendingRestore] = useState<AtlasBackup | null>(null);
  const [restoreVerification, setRestoreVerification] = useState<VerificationResult | null>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void listAttachmentRecords().then((records) => {
      setAttachmentCount(records.length);
      setAttachmentBytes(records.reduce((total, record) => total + record.byteSize, 0));
    });
  }, []);

  const handleCreate = useCallback(async () => {
    setError("");
    setIsWorking(true);

    try {
      const result = await createAtlasBackup({ includeAttachmentBytes: includeAttachments });
      setCreated(result);

      if (result.verification.ok) {
        downloadBackup(result);
        setLastBackupAt(new Date().toISOString());
      }
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Backup failed.");
    } finally {
      setIsWorking(false);
    }
  }, [includeAttachments, setLastBackupAt]);

  async function handleRestoreFile(file: File | undefined) {
    if (!file) return;
    setError("");

    const { backup, verification } = await readBackupFile(file);
    setRestoreVerification(verification);
    setPendingRestore(backup);

    if (restoreInputRef.current) restoreInputRef.current.value = "";
  }

  async function confirmRestore() {
    if (!pendingRestore) return;

    setIsWorking(true);

    try {
      await restoreAtlasBackup(pendingRestore);
      setPendingRestore(null);
      setRestoreVerification(null);
      // A full reload is the honest way to re-read every hook's state at
      // once; Atlas has no single "rehydrate everything" entry point.
      window.location.reload();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Restore failed.");
      setIsWorking(false);
    }
  }

  const cloudStatusLabel = !isCloudSyncAvailable ? "Local only — cloud sync is not configured" : !user ? "Local only — not signed in" : syncStatus === "syncing" ? "Syncing" : syncStatus === "synced" ? "Connected" : syncStatus === "offline" ? "Offline" : syncStatus === "error" ? "Error" : "Idle";

  return (
    <Card className="p-5">
      <p className="atlas-accent text-xs font-semibold uppercase tracking-[0.22em]">Data Safety</p>
      <h2 className="atlas-display mt-2 text-2xl font-bold text-white">Backup &amp; restore</h2>
      <p className="atlas-muted mt-2 text-sm">
        A backup captures every Atlas key stored in this browser, plus a record of every file in local storage. It is written to your Downloads folder — nothing is uploaded.
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
          <dt className="atlas-muted text-[0.6rem] font-semibold uppercase tracking-[0.2em]">Cloud</dt>
          <dd className="mt-1 text-sm text-white">{cloudStatusLabel}</dd>
          {lastSyncedAt ? <dd className="atlas-muted mt-0.5 text-[0.66rem]">Last sync {new Date(lastSyncedAt).toLocaleString()}</dd> : null}
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
          <dt className="atlas-muted text-[0.6rem] font-semibold uppercase tracking-[0.2em]">Last backup</dt>
          <dd className="mt-1 text-sm text-white">{lastBackupAt ? new Date(lastBackupAt).toLocaleString() : "Never"}</dd>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
          <dt className="atlas-muted text-[0.6rem] font-semibold uppercase tracking-[0.2em]">Files on device</dt>
          <dd className="mt-1 text-sm text-white">{attachmentCount === null ? "Checking…" : `${attachmentCount} (${formatBytes(attachmentBytes)})`}</dd>
        </div>
      </dl>

      {attachmentCount !== null && attachmentCount > 0 ? (
        <label className="atlas-muted mt-3 flex items-center gap-2 text-xs">
          <input type="checkbox" checked={includeAttachments} onChange={(event) => setIncludeAttachments(event.target.checked)} className="h-3.5 w-3.5 accent-[rgb(var(--atlas-accent,168_85_247))]" />
          Include file contents ({formatBytes(attachmentBytes)}) as a second download
        </label>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => void handleCreate()} disabled={isWorking} className={buttonClass}>
          {isWorking ? "Working…" : "Create Backup"}
        </button>
        <button type="button" onClick={() => restoreInputRef.current?.click()} disabled={isWorking} className={ghostClass}>
          Restore Backup
        </button>
        <input ref={restoreInputRef} type="file" accept="application/json,.json" onChange={(event) => void handleRestoreFile(event.target.files?.[0])} className="hidden" aria-label="Choose a backup file" />
      </div>

      {error ? (
        <p role="alert" className="mt-3 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
          {error}
        </p>
      ) : null}

      {created ? (
        <div className="mt-4">
          {created.verification.ok ? (
            <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-100" data-testid="backup-verified">
              ✓ SAFE BACKUP CREATED — verified and downloaded.
              {created.backup.metadata.attachmentCount > 0 && !created.backup.attachmentsExported
                ? " File contents were not included; the localStorage half is complete."
                : ""}
            </p>
          ) : (
            <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-100">
              ✕ Backup failed verification and was NOT downloaded.
            </p>
          )}
          <IssueList verification={created.verification} />
          <Manifest backup={created.backup} />
        </div>
      ) : null}

      {restoreVerification && !restoreVerification.ok ? (
        <div className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2">
          <p className="text-xs font-semibold text-rose-100">That file is not a valid Atlas backup. Nothing was changed.</p>
          <IssueList verification={restoreVerification} />
        </div>
      ) : null}

      {pendingRestore ? (
        <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] p-4" data-testid="restore-confirm">
          <p className="text-sm font-semibold text-amber-100">Restore this backup?</p>
          <p className="atlas-muted mt-1 text-xs">
            This replaces the Atlas data in this browser with the contents of the file. A safety copy of your current data will be downloaded first. Files stored in this browser are not
            affected.
          </p>
          <Manifest backup={pendingRestore} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void confirmRestore()} disabled={isWorking} className={buttonClass}>
              {isWorking ? "Restoring…" : "Download safety copy and restore"}
            </button>
            <button type="button" onClick={() => { setPendingRestore(null); setRestoreVerification(null); }} disabled={isWorking} className={ghostClass}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
