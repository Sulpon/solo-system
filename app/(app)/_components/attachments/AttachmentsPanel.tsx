"use client";

import { useRef, useState } from "react";
import { deleteDocumentFile, getDocumentFile } from "../../_lib/document-store";
import { formatFileSize } from "../../_lib/types/attachment";
import type { EntityAttachment } from "../../_lib/types/attachment";

type AttachmentsPanelProps = Readonly<{
  attachments: ReadonlyArray<EntityAttachment>;
  // Receives the picked files; the caller writes the bytes to
  // document-store and persists the metadata on its own entity, because
  // only the caller knows which entity these belong to.
  onAdd: (files: ReadonlyArray<File>) => Promise<void> | void;
  // Called AFTER the blob has been removed here, so the caller only has to
  // drop the metadata row.
  onRemove: (attachmentId: string) => void;
  label?: string;
  emptyHint?: string;
  testId?: string;
}>;

// Shared upload/download/delete UI for entity file attachments.
//
// Extracted from the CV documents implementation rather than copied: that
// page had ~80 lines of upload/download/size/error handling inline, and a
// second copy in the Library would have been two places to fix the next
// time (CvDetailPageClient is deliberately left untouched - migrating it is
// a separate change).
//
// Downloads go through an object URL created from the IndexedDB blob, and
// the URL is revoked immediately afterwards so the page does not leak one
// per download.
export default function AttachmentsPanel({ attachments, onAdd, onRemove, label = "Files", emptyHint = "No files attached yet.", testId }: AttachmentsPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    setError("");
    setIsBusy(true);

    try {
      await onAdd(Array.from(fileList));
    } catch {
      setError("Couldn't save one or more files. Please try again.");
    } finally {
      setIsBusy(false);
      // Always clear, so re-picking the same file fires onChange again.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function download(attachment: EntityAttachment) {
    setError("");
    const file = await getDocumentFile(attachment.id);

    // The metadata row syncs to other devices but the bytes never do - they
    // are IndexedDB, per browser. Say so plainly instead of failing
    // silently or pretending the file is corrupt.
    if (!file) {
      setError(`"${attachment.fileName}" isn't available on this device — files are only stored in the browser they were uploaded in.`);
      return;
    }

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = attachment.fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function remove(attachment: EntityAttachment) {
    setError("");
    // Bytes first, then the row: if this throws, the row stays and the file
    // is still reachable, which is recoverable. The reverse would orphan
    // the blob with no way to find it again.
    await deleteDocumentFile(attachment.id);
    onRemove(attachment.id);
  }

  return (
    <div data-testid={testId} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="atlas-accent text-[10px] font-semibold uppercase tracking-[0.18em]">{label}</p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isBusy}
          className="atlas-muted rounded-lg border border-white/10 px-3 py-1.5 text-xs transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBusy ? "Saving…" : "+ Add files"}
        </button>

        <input ref={inputRef} type="file" multiple onChange={(event) => handleFiles(event.target.files)} className="hidden" aria-label={`Add ${label.toLowerCase()}`} />
      </div>

      {error ? (
        <p role="alert" className="mt-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          {error}
        </p>
      ) : null}

      {attachments.length === 0 ? (
        <p className="atlas-muted mt-3 text-xs">{emptyHint}</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5">
              <button type="button" onClick={() => download(attachment)} className="min-w-0 flex-1 text-left" title={`Download ${attachment.fileName}`}>
                <span className="block truncate text-xs text-white">{attachment.fileName}</span>
                <span className="atlas-muted block text-[10px]">{formatFileSize(attachment.fileSize)}</span>
              </button>

              <button type="button" onClick={() => remove(attachment)} aria-label={`Remove ${attachment.fileName}`} className="atlas-muted shrink-0 rounded border border-white/10 px-1.5 py-0.5 text-[10px] transition hover:text-white">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
