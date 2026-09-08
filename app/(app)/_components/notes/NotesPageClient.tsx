"use client";

import { useMemo, useState } from "react";
import Card from "../Card";
import Modal from "../Modal";
import { useNotes } from "../../_lib/hooks/useNotes";
import { searchNotes, getAllTags } from "../../_lib/engines/note-search-engine";
import { NOTE_CATEGORIES } from "../../_lib/types/note";
import type { Note, NoteCategory } from "../../_lib/types/note";
import NoteCard from "./NoteCard";
import NoteEditor from "./NoteEditor";

type StatusFilter = "all" | "pinned" | "archived";

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";

const STATUS_TABS: ReadonlyArray<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "All Notes" },
  { id: "pinned", label: "Pinned" },
  { id: "archived", label: "Archived" },
];

type EditorState = { mode: "closed" } | { mode: "create" } | { mode: "edit"; note: Note };

export default function NotesPageClient() {
  const { notes, addNote, updateNote, deleteNote, setPinned, setArchived, hasLoaded } = useNotes();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<NoteCategory | "all">("all");
  const [tagFilter, setTagFilter] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editorState, setEditorState] = useState<EditorState>({ mode: "closed" });

  const usedCategories = useMemo(() => NOTE_CATEGORIES.filter((category) => notes.some((note) => note.category === category)), [notes]);
  const allTags = useMemo(() => getAllTags(notes), [notes]);

  const visibleNotes = useMemo(() => {
    let scoped: ReadonlyArray<Note> = notes.filter((note) => (statusFilter === "archived" ? note.archived : !note.archived));

    if (statusFilter === "pinned") {
      scoped = scoped.filter((note) => note.pinned);
    }

    if (categoryFilter !== "all") {
      scoped = scoped.filter((note) => note.category === categoryFilter);
    }

    if (tagFilter !== "all") {
      scoped = scoped.filter((note) => (note.tags ?? []).includes(tagFilter));
    }

    scoped = searchNotes(searchQuery, scoped);

    return [...scoped].sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [notes, statusFilter, categoryFilter, tagFilter, searchQuery]);

  if (!hasLoaded) {
    return (
      <Card className="p-5">
        <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4 text-sm text-slate-400">Loading Notes...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Notes</p>
            <h1 className="mt-1 text-2xl font-black text-white">Write it down before it&apos;s gone</h1>
          </div>
          <button
            type="button"
            onClick={() => setEditorState({ mode: "create" })}
            className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
          >
            + New Note
          </button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={
                "rounded-xl border px-4 py-2 text-sm font-semibold transition " +
                (statusFilter === tab.id ? "border-purple-400/60 bg-purple-500/15 text-white" : "border-slate-700 text-slate-400 hover:border-purple-500/40 hover:text-white")
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="space-y-1.5 sm:col-span-3">
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search title, content, tags..." className={inputClass} />
          </label>
        </div>

        {usedCategories.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={"rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] transition " + (categoryFilter === "all" ? "border-purple-400/60 bg-purple-500/15 text-white" : "border-slate-700 text-slate-500 hover:text-white")}
            >
              All Categories
            </button>
            {usedCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setCategoryFilter(category)}
                className={"rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] transition " + (categoryFilter === category ? "border-purple-400/60 bg-purple-500/15 text-white" : "border-slate-700 text-slate-500 hover:text-white")}
              >
                {category}
              </button>
            ))}
          </div>
        ) : null}

        {allTags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setTagFilter("all")}
              className={"rounded-full border px-2.5 py-1 text-[11px] transition " + (tagFilter === "all" ? "border-cyan-400/60 bg-cyan-500/15 text-white" : "border-slate-700 text-slate-500 hover:text-white")}
            >
              All Tags
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTagFilter(tag)}
                className={"rounded-full border px-2.5 py-1 text-[11px] transition " + (tagFilter === tag ? "border-cyan-400/60 bg-cyan-500/15 text-white" : "border-slate-700 text-slate-500 hover:text-white")}
              >
                #{tag}
              </button>
            ))}
          </div>
        ) : null}
      </Card>

      {visibleNotes.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-sm text-slate-400">
            {notes.length === 0 ? "No notes yet. Capture your first idea." : "No notes match your filters."}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onOpen={() => setEditorState({ mode: "edit", note })}
              onTogglePin={() => setPinned(note.id, !note.pinned)}
              onToggleArchive={() => setArchived(note.id, !note.archived)}
              onDelete={() => deleteNote(note.id)}
            />
          ))}
        </div>
      )}

      {editorState.mode !== "closed" ? (
        <Modal title={editorState.mode === "create" ? "New Note" : "Edit Note"} onClose={() => setEditorState({ mode: "closed" })} wide>
          <NoteEditor
            existingNote={editorState.mode === "edit" ? editorState.note : null}
            onCancel={() => setEditorState({ mode: "closed" })}
            onSave={(draft) => {
              if (editorState.mode === "edit") {
                updateNote(editorState.note.id, draft);
              } else {
                addNote(draft);
              }
              setEditorState({ mode: "closed" });
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}
