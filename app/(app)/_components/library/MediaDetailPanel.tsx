"use client";

import { useState } from "react";
import { getAvailableStatuses, getStatusLabel, getTypeLabel } from "../../_lib/engines/library-engine";
import type { GoalTree } from "../../_lib/types/goal-tree";
import type { MediaItem, MediaStatus } from "../../_lib/types/media-item";
import MediaCoverImage from "./MediaCoverImage";
import MediaStars from "./MediaStars";
import LibraryLinkedGoals from "./LibraryLinkedGoals";
import LibraryLinkedSkills from "./LibraryLinkedSkills";
import LibraryLinkedNotes from "./LibraryLinkedNotes";

type MediaDetailPanelProps = Readonly<{
  item: MediaItem;
  goalTree: GoalTree;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onChangeStatus: (status: MediaStatus) => void;
  onRate: (rating: number | undefined) => void;
  onLinkGoal: (goalId: string) => void;
  onUnlinkGoal: (goalId: string) => void;
  onLinkSkill: (skillId: string) => void;
  onUnlinkSkill: (skillId: string) => void;
  onLinkNote: (noteId: string) => void;
  onUnlinkNote: (noteId: string) => void;
}>;

const labelClass = "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const inputClass = "rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-purple-400";

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function MediaDetailPanel({
  item,
  goalTree,
  onClose,
  onEdit,
  onDelete,
  onChangeStatus,
  onRate,
  onLinkGoal,
  onUnlinkGoal,
  onLinkSkill,
  onUnlinkSkill,
  onLinkNote,
  onUnlinkNote,
}: MediaDetailPanelProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const startedLabel = formatDate(item.startedAt);
  const finishedLabel = formatDate(item.finishedAt);
  const startedFieldLabel = item.type === "book" ? "Reading Started" : "Watching Started";
  const finishedFieldLabel = "Finished";

  return (
    <div className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-950/70">
      <div className="flex items-start gap-4 p-5">
        <div className="h-28 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
          <MediaCoverImage coverImageId={item.coverImageId} type={item.type} title={item.title} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={labelClass}>{getTypeLabel(item.type)}</p>
              <h2 className="mt-0.5 text-lg font-black leading-tight text-white">{item.title}</h2>
              {item.creator ? <p className="mt-0.5 text-sm text-slate-400">{item.creator}</p> : null}
            </div>

            <div className="relative flex shrink-0 items-center gap-1">
              <button type="button" onClick={() => setMenuOpen((current) => !current)} aria-label="More options" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-800/60 hover:text-white">
                <svg viewBox="0 0 4 16" fill="currentColor" className="h-4 w-4">
                  <circle cx="2" cy="2" r="1.6" />
                  <circle cx="2" cy="8" r="1.6" />
                  <circle cx="2" cy="14" r="1.6" />
                </svg>
              </button>
              <button type="button" onClick={onClose} aria-label="Close media details" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-800/60 hover:text-white">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>

              {menuOpen ? (
                <div className="absolute right-0 top-9 z-10 w-36 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit();
                    }}
                    className="block w-full px-3 py-2 text-left text-xs font-semibold text-slate-300 transition hover:bg-slate-900 hover:text-white"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete();
                    }}
                    className="block w-full px-3 py-2 text-left text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10"
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            {item.year ? <span>{item.year}</span> : null}
            {item.genres && item.genres.length > 0 ? <span>{item.genres.join(", ")}</span> : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <span className={labelClass}>Status</span>
              <select value={item.status} onChange={(event) => onChangeStatus(event.target.value as MediaStatus)} className={inputClass}>
                {getAvailableStatuses(item.type).map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <MediaStars rating={item.rating} onRate={onRate} size="md" />
          </div>

          {startedLabel || finishedLabel ? (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              {startedLabel ? (
                <span>
                  {startedFieldLabel}: <span className="text-slate-300">{startedLabel}</span>
                </span>
              ) : null}
              {finishedLabel ? (
                <span>
                  {finishedFieldLabel}: <span className="text-slate-300">{finishedLabel}</span>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-5 border-t border-slate-800 p-5">
        <div>
          <p className={labelClass}>Overview</p>
          <p className="mt-1.5 text-sm leading-6 text-slate-300">{item.description?.trim() || "No description yet."}</p>
        </div>

        <div>
          <p className={labelClass}>My Description</p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.myDescription?.trim() || "Add your own take on this."}</p>
        </div>

        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
          <p className={labelClass + " text-purple-300"}>What I Learned</p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.whatILearned?.trim() || "Nothing captured yet."}</p>
        </div>
      </div>

      <LibraryLinkedGoals goalTree={goalTree} linkedGoalIds={item.linkedGoalIds ?? []} onLink={onLinkGoal} onUnlink={onUnlinkGoal} />
      <LibraryLinkedSkills linkedSkillIds={item.linkedSkillIds ?? []} onLink={onLinkSkill} onUnlink={onUnlinkSkill} />
      <LibraryLinkedNotes linkedNoteIds={item.linkedNoteIds ?? []} onLink={onLinkNote} onUnlink={onUnlinkNote} />
    </div>
  );
}
