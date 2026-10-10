"use client";

import { useRef, useState } from "react";
import { Image as ImageIcon, Link2, Paperclip, Send } from "lucide-react";
import { createAttachmentId, formatFileSize, type EntityAttachment } from "../../_lib/types/attachment";
import { putDocumentFile } from "../../_lib/document-store";
import { deriveNoteTitle, extractFirstUrl, getUrlHost } from "../../_lib/engines/note-inbox-engine";
import type { NoteDraft } from "../../_lib/hooks/useNotes";

type InboxComposerProps = Readonly<{
  onCapture: (draft: NoteDraft) => void;
}>;

// The dump box. One field, always open, never asks for a title or a
// category - those are the triage step, and demanding them here is exactly
// what stops a thought getting written down.
//
// Files are written to IndexedDB before the note is saved, so a note never
// references bytes that failed to store.
export default function InboxComposer({ onCapture }: InboxComposerProps) {
  const [content, setContent] = useState("");
  const [pending, setPending] = useState<ReadonlyArray<EntityAttachment>>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const detectedUrl = extractFirstUrl(content);
  const canSave = content.trim().length > 0 || pending.length > 0;

  async function storeFiles(files: ReadonlyArray<File>) {
    if (files.length === 0) {
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      const stored: EntityAttachment[] = [];

      for (const file of files) {
        const id = createAttachmentId("note-file");
        await putDocumentFile(id, file);
        stored.push({ id, fileName: file.name, fileType: file.type || "application/octet-stream", fileSize: file.size, uploadedAt: new Date().toISOString() });
      }

      setPending((current) => [...current, ...stored]);
    } catch {
      setError("That file could not be stored on this device. Nothing was attached.");
    } finally {
      setIsBusy(false);
    }
  }

  function save() {
    if (!canSave || isBusy) {
      return;
    }

    const body = content.trim();
    const url = detectedUrl ?? undefined;

    onCapture({
      title: deriveNoteTitle(body, url),
      content: body,
      url,
      attachments: pending.length > 0 ? pending : undefined,
      // No category on purpose: that is what puts it in the inbox.
      category: undefined,
    });

    setContent("");
    setPending([]);
    setError(null);
    inputRef.current?.focus();
  }

  return (
    <section
      onDragOver={(event) => {
        event.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDraggingOver(false);
        void storeFiles([...event.dataTransfer.files]);
      }}
      data-testid="inbox-composer"
      className={
        "atlas-surface rounded-2xl border p-4 transition " + (isDraggingOver ? "border-[rgb(var(--atlas-accent,168_85_247)/0.6)] bg-white/[0.04]" : "")
      }
    >
      <textarea
        ref={inputRef}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        onPaste={(event) => {
          // A screenshot pasted straight from the clipboard is a file.
          const files = [...event.clipboardData.files];

          if (files.length > 0) {
            event.preventDefault();
            void storeFiles(files);
          }
        }}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            save();
          }
        }}
        rows={3}
        placeholder="Dump a thought, paste a link, drop a picture…"
        aria-label="Capture a thought"
        data-testid="inbox-composer-input"
        className="atlas-input w-full resize-y bg-transparent text-sm leading-relaxed outline-none placeholder:text-white/30"
      />

      {detectedUrl ? (
        <p className="atlas-muted mt-2 flex items-center gap-1.5 text-[0.7rem]" data-testid="inbox-detected-url">
          <Link2 aria-hidden className="h-3.5 w-3.5" />
          Saving as a link to <span className="text-white/80">{getUrlHost(detectedUrl) ?? detectedUrl}</span>
        </p>
      ) : null}

      {pending.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5" data-testid="inbox-pending-files">
          {pending.map((attachment) => (
            <li key={attachment.id} className="atlas-muted flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1 text-[0.7rem]">
              {attachment.fileType.startsWith("image/") ? <ImageIcon aria-hidden className="h-3.5 w-3.5" /> : <Paperclip aria-hidden className="h-3.5 w-3.5" />}
              <span className="max-w-[12rem] truncate text-white/80">{attachment.fileName}</span>
              <span className="opacity-60">{formatFileSize(attachment.fileSize)}</span>
              <button
                type="button"
                onClick={() => setPending((current) => current.filter((entry) => entry.id !== attachment.id))}
                aria-label={`Remove ${attachment.fileName}`}
                className="ml-0.5 rounded px-1 transition hover:text-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="mt-2 text-[0.7rem] text-rose-300">{error}</p> : null}

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              void storeFiles([...(event.target.files ?? [])]);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="atlas-muted flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs transition hover:text-white"
          >
            <Paperclip aria-hidden className="h-3.5 w-3.5" />
            Attach
          </button>
          <span className="atlas-muted hidden text-[0.68rem] opacity-60 sm:inline">Ctrl + Enter to save · files stay on this device</span>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={!canSave || isBusy}
          data-testid="inbox-composer-save"
          className="atlas-accent flex items-center gap-1.5 rounded-lg border border-[rgb(var(--atlas-accent,168_85_247)/0.4)] bg-[rgb(var(--atlas-accent,168_85_247)/0.14)] px-3 py-1.5 text-xs font-semibold transition hover:bg-[rgb(var(--atlas-accent,168_85_247)/0.22)] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Send aria-hidden className="h-3.5 w-3.5" />
          {isBusy ? "Storing…" : "Capture"}
        </button>
      </div>
    </section>
  );
}
