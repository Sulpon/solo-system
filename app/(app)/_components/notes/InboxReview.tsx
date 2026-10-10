"use client";

import { useEffect, useState } from "react";
import { Archive, ChevronLeft, ChevronRight, ExternalLink, Trash2 } from "lucide-react";
import { getNoteKind, getUrlHost, hasTag, READ_LATER_TAG, WATCH_LATER_TAG } from "../../_lib/engines/note-inbox-engine";
import { useDocumentPhotoUrl } from "../../_lib/hooks/useDocumentPhotoUrl";
import { NOTE_CATEGORIES } from "../../_lib/types/note";
import type { Note, NoteCategory } from "../../_lib/types/note";

type InboxReviewProps = Readonly<{
  notes: ReadonlyArray<Note>;
  onFile: (noteId: string, category: NoteCategory) => void;
  onToggleLater: (noteId: string, tag: string) => void;
  onArchive: (noteId: string) => void;
  onDelete: (noteId: string) => void;
  onClose: () => void;
}>;

function ReviewImage({ attachmentId, alt }: Readonly<{ attachmentId: string; alt: string }>) {
  const url = useDocumentPhotoUrl(attachmentId);

  if (!url) {
    return <p className="atlas-muted text-xs">This picture is not on this device — files stay in the browser they were uploaded in.</p>;
  }

  // eslint-disable-next-line @next/next/no-img-element -- an object URL from IndexedDB, which next/image cannot optimise.
  return <img src={url} alt={alt} className="max-h-64 w-full rounded-xl border border-slate-800 object-contain" />;
}

// One item at a time, so filing a backlog is a sequence of small decisions
// rather than one overwhelming screen.
//
// Nothing here is compulsory: the pass can be closed at any point, skipping
// leaves an item exactly where it was, and capture is never blocked behind
// a clear inbox. There is deliberately no streak, score or "inbox zero"
// celebration - a counter that rewards emptying would be pressure to
// delete things worth keeping.
export default function InboxReview({ notes, onFile, onToggleLater, onArchive, onDelete, onClose }: InboxReviewProps) {
  const [position, setPosition] = useState(0);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // The list shrinks as items are filed, so the cursor has to be clamped
  // against the list that exists now, not the one the pass started with.
  const index = Math.min(position, Math.max(0, notes.length - 1));
  const note = notes[index];

  const step = (direction: 1 | -1) => {
    setConfirmingDelete(false);
    setPosition((current) => Math.min(Math.max(0, notes.length - 1), Math.max(0, current + direction)));
  };

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;

      // Never steal a keystroke meant for a field.
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.key === "ArrowRight" || event.key.toLowerCase() === "j") {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowLeft" || event.key.toLowerCase() === "k") {
        event.preventDefault();
        step(-1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (!note) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-white">Nothing left to review.</p>
        <p className="atlas-muted text-xs">Everything in the inbox has been filed or archived.</p>
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
          Done
        </button>
      </div>
    );
  }

  const kind = getNoteKind(note);
  const image = (note.attachments ?? []).find((attachment) => attachment.fileType.startsWith("image/"));
  const laterTag = kind === "video" ? WATCH_LATER_TAG : READ_LATER_TAG;

  return (
    <div className="space-y-4" data-testid="inbox-review">
      <div className="flex items-center justify-between gap-3">
        <p className="atlas-muted text-xs" data-testid="review-position">
          <span className="font-semibold text-white">{index + 1}</span> of {notes.length} unfiled
        </p>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => step(-1)} disabled={index === 0} aria-label="Previous item" className="atlas-muted rounded-lg p-1.5 transition hover:text-white disabled:opacity-30">
            <ChevronLeft aria-hidden className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => step(1)} disabled={index >= notes.length - 1} aria-label="Next item" className="atlas-muted rounded-lg p-1.5 transition hover:text-white disabled:opacity-30">
            <ChevronRight aria-hidden className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
        <h3 className="text-base font-semibold text-white">{note.title || "Untitled"}</h3>

        {note.content ? <p className="max-h-40 overflow-y-auto whitespace-pre-line text-sm leading-6 text-slate-300">{note.content}</p> : null}

        {image ? <ReviewImage attachmentId={image.id} alt={image.fileName} /> : null}

        {note.url ? (
          <a href={note.url} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1.5 text-xs text-purple-300 transition hover:text-purple-200">
            <ExternalLink aria-hidden className="h-3.5 w-3.5" />
            {getUrlHost(note.url) ?? note.url}
          </a>
        ) : null}

        {(note.attachments ?? []).length > 0 ? (
          <p className="atlas-muted text-xs">
            {(note.attachments ?? []).map((attachment) => attachment.fileName).join(", ")}
          </p>
        ) : null}
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">File as</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {NOTE_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => onFile(note.id, category)}
              className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400 transition hover:border-purple-400/60 hover:bg-purple-500/10 hover:text-purple-200"
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onToggleLater(note.id, laterTag)}
            className={"rounded-lg border px-3 py-1.5 text-xs transition " + (hasTag(note, laterTag) ? "border-cyan-400/50 bg-cyan-500/10 text-cyan-200" : "border-slate-700 text-slate-400 hover:text-white")}
          >
            {kind === "video" ? "Watch later" : "Read later"}
          </button>
          <button type="button" onClick={() => step(1)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:text-white">
            Skip
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onArchive(note.id)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:text-white"
          >
            <Archive aria-hidden className="h-3.5 w-3.5" />
            Archive
          </button>

          {/* Two steps, because this one cannot be undone. */}
          {confirmingDelete ? (
            <button
              type="button"
              onClick={() => {
                onDelete(note.id);
                setConfirmingDelete(false);
              }}
              className="rounded-lg border border-rose-400/50 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/25"
            >
              Delete for good
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-rose-400/80 transition hover:text-rose-300"
            >
              <Trash2 aria-hidden className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
        </div>
      </div>

      <p className="atlas-muted text-center text-[11px] opacity-70">← → or J / K to move · close any time, nothing has to be filed</p>
    </div>
  );
}
