"use client";

import Card from "../Card";
import type { Note } from "../../_lib/types/note";

type NoteCardProps = Readonly<{
  note: Note;
  onOpen: () => void;
  onTogglePin: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}>;

export default function NoteCard({ note, onOpen, onTogglePin, onToggleArchive, onDelete }: NoteCardProps) {
  const displayTitle = note.title || note.content.split("\n")[0].slice(0, 60) || "Untitled";
  const preview = note.content.length > 160 ? `${note.content.slice(0, 160)}...` : note.content;

  return (
    <Card className="flex h-full flex-col gap-3 p-4">
      <div className="min-w-0 flex-1 cursor-pointer" onClick={onOpen}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate text-sm font-semibold text-white">{displayTitle}</h3>
          {note.pinned ? <span className="shrink-0 text-amber-300">📌</span> : null}
        </div>
        <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-xs leading-5 text-slate-400">{preview}</p>
      </div>

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
