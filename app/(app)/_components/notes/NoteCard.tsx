"use client";

import { FileText, Image as ImageIcon, Link2, Paperclip, PlayCircle } from "lucide-react";
import Card from "../Card";
import { getNoteKind, getUrlHost, hasTag, READ_LATER_TAG, WATCH_LATER_TAG, type NoteKind } from "../../_lib/engines/note-inbox-engine";
import { useDocumentPhotoUrl } from "../../_lib/hooks/useDocumentPhotoUrl";
import { NOTE_CATEGORIES } from "../../_lib/types/note";
import type { Note, NoteCategory } from "../../_lib/types/note";

type NoteCardProps = Readonly<{
  note: Note;
  onOpen: () => void;
  onTogglePin: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
  // Supplied only in the inbox, where filing is the whole point. Absent
  // elsewhere so a filed note's card stays as it was.
  onFile?: (category: NoteCategory) => void;
  // Flips the read-later / watch-later tag. Absent where the action does
  // not belong, e.g. the archive.
  onToggleLater?: (tag: string) => void;
}>;

// Its own component because the blob lookup is a hook, and a card without
// a picture must not call it. Renders nothing at all when the blob is not
// on this device - a broken frame would be worse than no frame.
function AttachmentPreview({ attachmentId, alt }: Readonly<{ attachmentId: string; alt: string }>) {
  const url = useDocumentPhotoUrl(attachmentId);

  if (!url) {
    return null;
  }

  return (
    <div className="-mx-1 overflow-hidden rounded-lg border border-slate-800">
      {/* eslint-disable-next-line @next/next/no-img-element -- an object URL from IndexedDB, which next/image cannot optimise. */}
      <img src={url} alt={alt} className="h-32 w-full object-cover" />
    </div>
  );
}

const KIND_ICON: Readonly<Record<NoteKind, typeof FileText>> = {
  text: FileText,
  link: Link2,
  video: PlayCircle,
  image: ImageIcon,
  file: Paperclip,
};

export default function NoteCard({ note, onOpen, onTogglePin, onToggleArchive, onDelete, onFile, onToggleLater }: NoteCardProps) {
  const displayTitle = note.title || note.content.split("\n")[0].slice(0, 60) || "Untitled";
  const preview = note.content.length > 160 ? `${note.content.slice(0, 160)}...` : note.content;
  const kind = getNoteKind(note);
  const KindIcon = KIND_ICON[kind];
  const attachmentCount = note.attachments?.length ?? 0;
  const previewImage = (note.attachments ?? []).find((attachment) => attachment.fileType.startsWith("image/"));
  const readLater = hasTag(note, READ_LATER_TAG);
  const watchLater = hasTag(note, WATCH_LATER_TAG);

  return (
    <Card className="flex h-full flex-col gap-3 p-4">
      <div className="min-w-0 flex-1 cursor-pointer" onClick={onOpen}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex min-w-0 items-start gap-1.5 text-sm font-semibold text-white">
            <KindIcon aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
            <span className="min-w-0 truncate">{displayTitle}</span>
          </h3>
          {note.pinned ? <span className="shrink-0 text-amber-300">📌</span> : null}
        </div>
        <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-xs leading-5 text-slate-400">{preview}</p>
      </div>

      {previewImage ? <AttachmentPreview attachmentId={previewImage.id} alt={previewImage.fileName} /> : null}

      {note.url || attachmentCount > 0 ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          {note.url ? (
            <a
              href={note.url}
              target="_blank"
              rel="noreferrer noopener"
              onClick={(event) => event.stopPropagation()}
              className="flex min-w-0 items-center gap-1 text-purple-300 transition hover:text-purple-200"
            >
              <Link2 aria-hidden className="h-3 w-3 shrink-0" />
              <span className="truncate">{getUrlHost(note.url) ?? note.url}</span>
            </a>
          ) : null}
          {attachmentCount > 0 ? (
            <span className="flex items-center gap-1 text-slate-500">
              <Paperclip aria-hidden className="h-3 w-3" />
              {attachmentCount} file{attachmentCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Filing is one click, right on the card - the whole point of a
          triage pass is not having to open anything. */}
      {onFile && !note.category ? (
        <div className="flex flex-wrap gap-1" data-testid={`note-triage-${note.id}`}>
          {NOTE_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => onFile(category)}
              className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500 transition hover:border-purple-400/60 hover:bg-purple-500/10 hover:text-purple-200"
            >
              {category}
            </button>
          ))}
        </div>
      ) : null}

      {note.category || (note.tags && note.tags.length > 0) ? (
        <div className="flex flex-wrap gap-1.5">
          {note.category ? (
            <span className="rounded-full border border-purple-400/40 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-purple-200">{note.category}</span>
          ) : null}
          {(note.tags ?? []).map((tag) => (
            <span key={tag} className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-[10px] text-slate-400">
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-between border-t border-slate-800 pt-2.5 text-[11px] text-slate-500">
        <span>{new Date(note.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
        <div className="flex items-center gap-3">
          {onToggleLater ? (
            <button
              type="button"
              onClick={() => onToggleLater(kind === "video" ? WATCH_LATER_TAG : READ_LATER_TAG)}
              title={kind === "video" ? "Watch later" : "Read later"}
              className={"transition hover:text-white " + (readLater || watchLater ? "text-cyan-300" : "text-slate-500")}
            >
              {kind === "video" ? (watchLater ? "Watching" : "Watch later") : readLater ? "Reading" : "Read later"}
            </button>
          ) : null}
          <button type="button" onClick={onTogglePin} className={"transition hover:text-white " + (note.pinned ? "text-amber-300" : "text-slate-500")}>
            {note.pinned ? "Unpin" : "Pin"}
          </button>
          <button type="button" onClick={onToggleArchive} className="text-slate-500 transition hover:text-white">
            {note.archived ? "Unarchive" : "Archive"}
          </button>
          <button type="button" onClick={onDelete} className="text-rose-400/80 transition hover:text-rose-300">
            Delete
          </button>
        </div>
      </div>
    </Card>
  );
}
