"use client";

import { useState } from "react";
import Link from "next/link";
import { useNotes } from "../../_lib/hooks/useNotes";

type LibraryLinkedNotesProps = Readonly<{
  linkedNoteIds: ReadonlyArray<string>;
  onLink: (noteId: string) => void;
  onUnlink: (noteId: string) => void;
}>;

// "Related Notes" (section 22) - a simple id-array on MediaItem pointing at
// real Notes (types/note.ts), the same shallow-reference shape as
// linkedGoalIds/linkedSkillIds. Note.links (NoteLink) is a different,
// currently-unused mechanism for the reverse direction (a Note pointing at
// other entities) - reusing it here isn't necessary since MediaItem already
// has its own array of ids to point outward with. This is a first-class,
// working link (not a stub): the picker below only offers real, persisted
// Notes, and "Related Notes" resolves their titles live - nothing here
// duplicates or forks Notes storage.
export default function LibraryLinkedNotes({ linkedNoteIds, onLink, onUnlink }: LibraryLinkedNotesProps) {
  const { notes } = useNotes();
  const [picking, setPicking] = useState(false);
  const linkedNotes = linkedNoteIds.map((id) => notes.find((note) => note.id === id)).filter((note) => Boolean(note));
  const availableNotes = notes.filter((note) => !linkedNoteIds.includes(note.id));

  return (
    <div className="border-t border-slate-800 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Related Notes</p>
        {availableNotes.length > 0 && !picking ? (
          <button type="button" onClick={() => setPicking(true)} className="rounded-lg border border-purple-400/50 bg-purple-500/15 px-3 py-1.5 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/25">
            + Link Note
          </button>
        ) : null}
      </div>

      {picking ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) onLink(event.target.value);
              setPicking(false);
            }}
            className="rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-purple-400"
          >
            <option value="" disabled>
              Select a note...
            </option>
            {availableNotes.map((note) => (
              <option key={note.id} value={note.id}>
                {note.title || "Untitled"}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setPicking(false)} className="text-xs text-slate-500 transition hover:text-white">
            Cancel
          </button>
        </div>
      ) : null}

      {linkedNotes.length === 0 && !picking ? (
        <p className="mt-3 text-sm text-slate-500">
          {notes.length === 0 ? "No notes exist yet - create one from the Notes page, then link it here." : "No notes linked yet."}
        </p>
      ) : null}

      {linkedNotes.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          {linkedNotes.map((note) => (
            <div key={note!.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
              <Link href="/notes" className="min-w-0 truncate font-semibold text-white hover:text-purple-200">
                {note!.title || "Untitled"}
              </Link>
              <button type="button" onClick={() => onUnlink(note!.id)} className="shrink-0 text-xs text-slate-500 transition hover:text-rose-300" aria-label={`Unlink ${note!.title}`}>
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
