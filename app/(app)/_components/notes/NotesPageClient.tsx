"use client";

import { useMemo, useState } from "react";
import Card from "../Card";
import Modal from "../Modal";
import { useNotes } from "../../_lib/hooks/useNotes";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { useAttributes } from "../../_lib/hooks/useAttributes";
import { useProgression } from "../../_lib/hooks/useProgression";
import { useLibrary } from "../../_lib/hooks/useLibrary";
import { searchNotes, getAllTags } from "../../_lib/engines/note-search-engine";
import { getNoteRelationships } from "../../_lib/relationships";
import { isInboxNote, NOTE_CATEGORIES } from "../../_lib/types/note";
import { countByKind, filterByKind, NOTE_SORTS, sortNotes, summariseInbox, toggleTag, type NoteKindFilter, type NoteSort } from "../../_lib/engines/note-inbox-engine";
import { createAttachmentId } from "../../_lib/types/attachment";
import { putDocumentFile } from "../../_lib/document-store";
import InboxComposer from "./InboxComposer";
import InboxReview from "./InboxReview";
import type { Note, NoteCategory } from "../../_lib/types/note";
import NoteCard from "./NoteCard";
import NoteEditor from "./NoteEditor";
import NoteLinkPicker from "./NoteLinkPicker";
import RelatedEntitiesPanel from "../relationships/RelatedEntitiesPanel";

type StatusFilter = "inbox" | "all" | "pinned" | "archived";

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";

const STATUS_TABS: ReadonlyArray<{ id: StatusFilter; label: string }> = [
  { id: "inbox", label: "Inbox" },
  { id: "all", label: "All Notes" },
  { id: "pinned", label: "Pinned" },
  { id: "archived", label: "Archived" },
];

const KIND_FILTERS: ReadonlyArray<{ id: NoteKindFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "text", label: "Text" },
  { id: "link", label: "Links" },
  { id: "video", label: "Videos" },
  { id: "image", label: "Images" },
  { id: "file", label: "Docs" },
];

type EditorState = { mode: "closed" } | { mode: "create" } | { mode: "edit"; note: Note };

export default function NotesPageClient() {
  const { notes, addNote, updateNote, deleteNote, setPinned, setArchived, setCategory, addAttachments, removeAttachment, addLink, removeLink, hasLoaded } = useNotes();
  const { goalTree } = useGoalTree();
  const { attributes } = useAttributes();
  const { questDefinitions } = useProgression();
  const { items: libraryItems } = useLibrary();
  // The inbox is the landing view: the page exists to be dumped into.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("inbox");
  const [categoryFilter, setCategoryFilter] = useState<NoteCategory | "all">("all");
  const [tagFilter, setTagFilter] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<NoteKindFilter>("all");
  const [isReviewing, setIsReviewing] = useState(false);
  const [sort, setSort] = useState<NoteSort>("newest");
  const [editorState, setEditorState] = useState<EditorState>({ mode: "closed" });

  const summary = useMemo(() => summariseInbox(notes), [notes]);
  const unfiledNotes = useMemo(() => sortNotes(notes.filter(isInboxNote), "newest"), [notes]);
  // Counts for the type chips, over whatever the other filters already
  // left - so a count never promises results a click will not produce.
  const kindCounts = useMemo(() => {
    const scoped = notes.filter((note) => (statusFilter === "archived" ? note.archived : !note.archived));
    return countByKind(statusFilter === "inbox" ? scoped.filter(isInboxNote) : scoped);
  }, [notes, statusFilter]);

  const usedCategories = useMemo(() => NOTE_CATEGORIES.filter((category) => notes.some((note) => note.category === category)), [notes]);
  const allTags = useMemo(() => getAllTags(notes), [notes]);

  const visibleNotes = useMemo(() => {
    let scoped: ReadonlyArray<Note> = notes.filter((note) => (statusFilter === "archived" ? note.archived : !note.archived));

    if (statusFilter === "pinned") {
      scoped = scoped.filter((note) => note.pinned);
    }

    // Everything not yet filed, newest first. A pinned-first sort would be
    // wrong here: the inbox is a stack you work down, not a shelf.
    if (statusFilter === "inbox") {
      return sortNotes(filterByKind(searchNotes(searchQuery, scoped.filter(isInboxNote)), kindFilter), sort);
    }

    if (categoryFilter !== "all") {
      scoped = scoped.filter((note) => note.category === categoryFilter);
    }

    if (tagFilter !== "all") {
      scoped = scoped.filter((note) => (note.tags ?? []).includes(tagFilter));
    }

    scoped = filterByKind(searchNotes(searchQuery, scoped), kindFilter);

    return [...scoped].sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [notes, statusFilter, categoryFilter, tagFilter, searchQuery, kindFilter, sort]);

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
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Knowledge System</p>
            <h1 className="mt-1 text-2xl font-black text-white">Notes Inbox</h1>
            <p className="mt-1 text-sm text-slate-400">Dump your thoughts. Organize later.</p>
            {/* Counted from the notes themselves - see summariseInbox. */}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500" data-testid="inbox-metrics">
              <span>
                <span className="font-semibold text-white">{summary.total}</span> saved
              </span>
              <span>
                <span className="font-semibold text-white">{summary.uncategorized}</span> unfiled
              </span>
              <span>
                <span className="font-semibold text-white">{summary.capturedToday}</span> captured today
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.uncategorized > 0 ? (
              <button
                type="button"
                onClick={() => setIsReviewing(true)}
                data-testid="start-review"
                className="rounded-xl border border-cyan-400/50 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
              >
                Review {summary.uncategorized}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setEditorState({ mode: "create" })}
              className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
            >
              + New Note
            </button>
          </div>
        </div>
      </Card>

      {/* Always open, above everything else: the cost of writing a
          thought down has to be one click and one field. */}
      <InboxComposer onCapture={(draft) => addNote(draft)} />

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
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search text, tags, category, link or filename..." className={inputClass} />
          </label>
        </div>

        {/* Type chips carry live counts over the current view, and the
            sort sits beside them rather than in a separate toolbar. */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5" data-testid="kind-filters">
            {KIND_FILTERS.map((entry) => {
              const count = entry.id === "all" ? Object.values(kindCounts).reduce((sum, value) => sum + value, 0) : kindCounts[entry.id];

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setKindFilter(entry.id)}
                  disabled={count === 0 && entry.id !== "all"}
                  className={
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] transition disabled:cursor-not-allowed disabled:opacity-30 " +
                    (kindFilter === entry.id ? "border-cyan-400/60 bg-cyan-500/15 text-white" : "border-slate-700 text-slate-500 hover:text-white")
                  }
                >
                  {entry.label} <span className="opacity-60">{count}</span>
                </button>
              );
            })}
          </div>

          <label className="flex items-center gap-2 text-[11px] text-slate-500">
            Sort
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as NoteSort)}
              data-testid="note-sort"
              className="rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1 text-[11px] text-white outline-none transition focus:border-purple-400"
            >
              {NOTE_SORTS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
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
            {statusFilter === "inbox"
              ? notes.length === 0
                ? "Nothing captured yet. Write the first thing above."
                : "Inbox clear — everything is filed."
              : notes.length === 0
                ? "No notes yet. Capture your first idea."
                : "No notes match your filters."}
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
              onFile={statusFilter === "inbox" ? (category) => setCategory(note.id, category) : undefined}
              onToggleLater={(tag) => updateNote(note.id, { title: note.title, content: note.content, category: note.category, tags: toggleTag(note.tags, tag), url: note.url })}
            />
          ))}
        </div>
      )}

      {isReviewing ? (
        <Modal title="Review inbox" onClose={() => setIsReviewing(false)} wide>
          <InboxReview
            notes={unfiledNotes}
            onFile={(noteId, category) => setCategory(noteId, category)}
            onToggleLater={(noteId, tag) => {
              const target = notes.find((entry) => entry.id === noteId);
              if (target) {
                updateNote(noteId, { title: target.title, content: target.content, category: target.category, tags: toggleTag(target.tags, tag), url: target.url });
              }
            }}
            onArchive={(noteId) => setArchived(noteId, true)}
            onDelete={(noteId) => deleteNote(noteId)}
            onClose={() => setIsReviewing(false)}
          />
        </Modal>
      ) : null}

      {editorState.mode !== "closed" ? (
        <Modal title={editorState.mode === "create" ? "New Note" : "Edit Note"} onClose={() => setEditorState({ mode: "closed" })} wide>
          <NoteEditor
            existingNote={editorState.mode === "edit" ? editorState.note : null}
            onAddFiles={
              editorState.mode === "edit"
                ? async (files) => {
                    const noteId = editorState.note.id;
                    const stored = [];
                    for (const file of files) {
                      const id = createAttachmentId("note-file");
                      await putDocumentFile(id, file);
                      stored.push({ id, fileName: file.name, fileType: file.type || "application/octet-stream", fileSize: file.size, uploadedAt: new Date().toISOString() });
                    }
                    addAttachments(noteId, stored);
                  }
                : undefined
            }
            onRemoveFile={editorState.mode === "edit" ? (attachmentId) => removeAttachment(editorState.note.id, attachmentId) : undefined}
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

          {editorState.mode === "edit" ? (
            <div className="mt-5 space-y-4">
              <NoteLinkPicker
                note={editorState.note}
                allNotes={notes}
                onAddLink={(link) => addLink(editorState.note.id, link)}
                onRemoveLink={(linkId) => removeLink(editorState.note.id, linkId)}
              />
              <RelatedEntitiesPanel groups={getNoteRelationships(editorState.note, goalTree, questDefinitions, attributes, notes, libraryItems)} />
            </div>
          ) : null}
        </Modal>
      ) : null}
    </div>
  );
}
