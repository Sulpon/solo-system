"use client";

import { useMemo, useState } from "react";
import Card from "../Card";
import Modal from "../Modal";
import { useLibrary } from "../../_lib/hooks/useLibrary";
import type { MediaDraft } from "../../_lib/hooks/useLibrary";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { getAllGenres, getStatusCounts, getStatusLabel, MEDIA_SORT_OPTIONS, searchLibrary, sortMediaItems } from "../../_lib/engines/library-engine";
import { MEDIA_STATUSES, MEDIA_TYPES } from "../../_lib/types/media-item";
import type { MediaSortKey } from "../../_lib/engines/library-engine";
import type { MediaItem, MediaStatus, MediaType } from "../../_lib/types/media-item";
import MediaCard from "./MediaCard";
import MediaDetailPanel from "./MediaDetailPanel";
import MediaForm from "./MediaForm";

type TypeFilter = MediaType | "all";
type StatusFilter = MediaStatus | "all";

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400";

const TYPE_TAB_LABELS: Record<TypeFilter, string> = { all: "All", book: "Books", movie: "Movies", series: "Series" };

type FormState = { mode: "closed" } | { mode: "create" } | { mode: "edit"; item: MediaItem };

export default function LibraryPageClient() {
  const { items, hasLoaded, addItem, updateItem, deleteItem, changeStatus, setRating, linkGoal, unlinkGoal, linkSkill, unlinkSkill, linkNote, unlinkNote } = useLibrary();
  const { goalTree } = useGoalTree();

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [genreFilter, setGenreFilter] = useState<string | "all">("all");
  const [sortKey, setSortKey] = useState<MediaSortKey>("recently_added");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>({ mode: "closed" });

  const typeScopedItems = useMemo(() => (typeFilter === "all" ? items : items.filter((item) => item.type === typeFilter)), [items, typeFilter]);
  const statusCounts = useMemo(() => getStatusCounts(typeScopedItems), [typeScopedItems]);
  const allGenres = useMemo(() => getAllGenres(typeScopedItems), [typeScopedItems]);

  const visibleItems = useMemo(() => {
    let scoped: ReadonlyArray<MediaItem> = typeScopedItems;

    if (statusFilter !== "all") {
      scoped = scoped.filter((item) => item.status === statusFilter);
    }

    if (genreFilter !== "all") {
      scoped = scoped.filter((item) => (item.genres ?? []).includes(genreFilter));
    }

    scoped = searchLibrary(searchQuery, scoped);

    return sortMediaItems(scoped, sortKey);
  }, [typeScopedItems, statusFilter, genreFilter, searchQuery, sortKey]);

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;

  function openEdit(item: MediaItem) {
    setFormState({ mode: "edit", item });
  }

  function handleSave(draft: MediaDraft) {
    if (formState.mode === "edit") {
      updateItem(formState.item.id, draft);
    } else {
      addItem(draft);
    }
    setFormState({ mode: "closed" });
  }

  function handleDelete(id: string) {
    deleteItem(id);
    setSelectedItemId((current) => (current === id ? null : current));
  }

  if (!hasLoaded) {
    return (
      <Card className="p-5">
        <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4 text-sm text-slate-400">Loading Library...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Library</p>
            <h1 className="mt-1 text-2xl font-black text-white">Your books, movies and series.</h1>
          </div>
          <button
            type="button"
            onClick={() => setFormState({ mode: "create" })}
            className="rounded-xl border border-cyan-400/50 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25"
          >
            + Add Item
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search books, movies, series..." className={inputClass} />
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value as MediaSortKey)} className={inputClass + " sm:w-52"}>
            {MEDIA_SORT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {(["all", ...MEDIA_TYPES] as ReadonlyArray<TypeFilter>).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTypeFilter(option)}
              className={
                "rounded-xl border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] transition " +
                (typeFilter === option ? "border-cyan-400/60 bg-cyan-500/15 text-white" : "border-slate-700 text-slate-400 hover:border-cyan-500/40 hover:text-white")
              }
            >
              {TYPE_TAB_LABELS[option]}
            </button>
          ))}
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={
              "rounded-full border px-3 py-1 text-[11px] font-semibold transition " +
              (statusFilter === "all" ? "border-purple-400/60 bg-purple-500/15 text-white" : "border-slate-700 text-slate-500 hover:text-white")
            }
          >
            All {typeScopedItems.length}
          </button>
          {MEDIA_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={
                "rounded-full border px-3 py-1 text-[11px] font-semibold transition " +
                (statusFilter === status ? "border-purple-400/60 bg-purple-500/15 text-white" : "border-slate-700 text-slate-500 hover:text-white")
              }
            >
              {getStatusLabel(status)} {statusCounts[status]}
            </button>
          ))}
        </div>

        {allGenres.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setGenreFilter("all")}
              className={"rounded-full border px-2.5 py-1 text-[11px] transition " + (genreFilter === "all" ? "border-cyan-400/60 bg-cyan-500/15 text-white" : "border-slate-700 text-slate-500 hover:text-white")}
            >
              All Genres
            </button>
            {allGenres.map((genre) => (
              <button
                key={genre}
                type="button"
                onClick={() => setGenreFilter(genre)}
                className={"rounded-full border px-2.5 py-1 text-[11px] transition " + (genreFilter === genre ? "border-cyan-400/60 bg-cyan-500/15 text-white" : "border-slate-700 text-slate-500 hover:text-white")}
              >
                {genre}
              </button>
            ))}
          </div>
        ) : null}
      </Card>

      <div className={"grid gap-5 " + (selectedItem ? "lg:grid-cols-[minmax(0,1fr)_420px]" : "")}>
        {visibleItems.length === 0 ? (
          <Card className="p-8">
            <div className="text-center text-sm text-slate-400">{items.length === 0 ? "Your library is empty. Add your first book, movie or series." : "Nothing matches your filters."}</div>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {visibleItems.map((item) => (
              <MediaCard key={item.id} item={item} onOpen={() => setSelectedItemId(item.id)} />
            ))}
          </div>
        )}

        {selectedItem ? (
          <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-950 p-4 lg:static lg:z-auto lg:overflow-visible lg:bg-transparent lg:p-0">
            <button
              type="button"
              onClick={() => setSelectedItemId(null)}
              className="mb-3 flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-400/60 hover:text-white lg:hidden"
            >
              ← Back
            </button>
            <MediaDetailPanel
              item={selectedItem}
              goalTree={goalTree}
              onClose={() => setSelectedItemId(null)}
              onEdit={() => openEdit(selectedItem)}
              onDelete={() => handleDelete(selectedItem.id)}
              onChangeStatus={(status) => changeStatus(selectedItem.id, status)}
              onRate={(rating) => setRating(selectedItem.id, rating)}
              onLinkGoal={(goalId) => linkGoal(selectedItem.id, goalId)}
              onUnlinkGoal={(goalId) => unlinkGoal(selectedItem.id, goalId)}
              onLinkSkill={(skillId) => linkSkill(selectedItem.id, skillId)}
              onUnlinkSkill={(skillId) => unlinkSkill(selectedItem.id, skillId)}
              onLinkNote={(noteId) => linkNote(selectedItem.id, noteId)}
              onUnlinkNote={(noteId) => unlinkNote(selectedItem.id, noteId)}
            />
          </div>
        ) : null}
      </div>

      {formState.mode !== "closed" ? (
        <Modal title={formState.mode === "create" ? "Add Item" : "Edit Item"} onClose={() => setFormState({ mode: "closed" })}>
          <MediaForm existingItem={formState.mode === "edit" ? formState.item : null} onCancel={() => setFormState({ mode: "closed" })} onSave={handleSave} />
        </Modal>
      ) : null}
    </div>
  );
}
