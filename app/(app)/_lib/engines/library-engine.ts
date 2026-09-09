import type { GoalNode, GoalTree } from "../types/goal-tree";
import type { MediaItem, MediaStatus, MediaType } from "../types/media-item";
import { MEDIA_STATUSES, MEDIA_TYPES } from "../types/media-item";

// The one thing that actually differs between a Book and a Movie/Series:
// which "currently consuming" status applies. Everything else (Planned/
// Finished/Dropped) is shared.
export function getInProgressStatus(type: MediaType): MediaStatus {
  return type === "book" ? "reading" : "watching";
}

// What the status picker is allowed to offer for a given type - a book can
// never be "watching" and a movie/series can never be "reading".
export function getAvailableStatuses(type: MediaType): ReadonlyArray<MediaStatus> {
  return [getInProgressStatus(type), "planned", "finished", "dropped"];
}

const STATUS_LABELS: Record<MediaStatus, string> = {
  reading: "Reading",
  watching: "Watching",
  planned: "Planned",
  finished: "Finished",
  dropped: "Dropped",
};

export function getStatusLabel(status: MediaStatus): string {
  return STATUS_LABELS[status] ?? status;
}

const TYPE_LABELS: Record<MediaType, string> = {
  book: "Book",
  movie: "Movie",
  series: "Series",
};

export function getTypeLabel(type: MediaType): string {
  return TYPE_LABELS[type] ?? type;
}

function todayIso() {
  return new Date().toISOString();
}

// Section 14 of the spec: a status change can intelligently fill in a date,
// but must never silently overwrite one that's already there - if the user
// wants to correct a date, they edit it explicitly via the form.
export function applyStatusChange(item: MediaItem, nextStatus: MediaStatus, now = todayIso()): MediaItem {
  const wasInProgress = item.status === "reading" || item.status === "watching";
  const becomesInProgress = nextStatus === "reading" || nextStatus === "watching";

  const startedAt = !wasInProgress && becomesInProgress && !item.startedAt ? now : item.startedAt;
  const finishedAt = wasInProgress && nextStatus === "finished" && !item.finishedAt ? now : item.finishedAt;

  return { ...item, status: nextStatus, startedAt, finishedAt, updatedAt: now };
}

// Defensive against old/malformed records (section 30) - applied once on
// read in useLibrary.ts so every other piece of UI can trust the shape
// without repeating these checks.
export function sanitizeMediaItem(raw: MediaItem): MediaItem {
  const type: MediaType = MEDIA_TYPES.includes(raw.type) ? raw.type : "book";
  const status: MediaStatus = MEDIA_STATUSES.includes(raw.status) ? raw.status : "planned";
  const rating = typeof raw.rating === "number" && Number.isFinite(raw.rating) ? Math.min(5, Math.max(1, Math.round(raw.rating))) : undefined;
  const year = typeof raw.year === "number" && Number.isFinite(raw.year) ? raw.year : undefined;
  const genres = Array.isArray(raw.genres) ? raw.genres.filter((genre): genre is string => typeof genre === "string" && genre.trim().length > 0) : undefined;

  return {
    ...raw,
    title: raw.title?.trim() || "Untitled",
    type,
    status,
    rating,
    year,
    genres,
    createdAt: raw.createdAt || todayIso(),
    updatedAt: raw.updatedAt || raw.createdAt || todayIso(),
  };
}

export function searchLibrary(query: string, items: ReadonlyArray<MediaItem>): ReadonlyArray<MediaItem> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return items;
  }

  return items.filter((item) => {
    if (item.title.toLowerCase().includes(trimmed)) return true;
    if (item.creator?.toLowerCase().includes(trimmed)) return true;
    if (item.myDescription?.toLowerCase().includes(trimmed)) return true;
    if (item.whatILearned?.toLowerCase().includes(trimmed)) return true;
    return (item.genres ?? []).some((genre) => genre.toLowerCase().includes(trimmed));
  });
}

export function getAllGenres(items: ReadonlyArray<MediaItem>): ReadonlyArray<string> {
  const genres = new Set<string>();
  for (const item of items) {
    for (const genre of item.genres ?? []) {
      genres.add(genre);
    }
  }
  return Array.from(genres).sort((first, second) => first.localeCompare(second));
}

// Counts for the status filter chips (section 16) - always derived live
// from the actual (already type-filtered) item list, never hardcoded.
export function getStatusCounts(items: ReadonlyArray<MediaItem>): Record<MediaStatus, number> {
  const counts: Record<MediaStatus, number> = { reading: 0, watching: 0, planned: 0, finished: 0, dropped: 0 };
  for (const item of items) {
    counts[item.status] = (counts[item.status] ?? 0) + 1;
  }
  return counts;
}

export type MediaSortKey = "recently_added" | "recently_updated" | "title" | "year" | "rating" | "recently_finished";

export const MEDIA_SORT_OPTIONS: ReadonlyArray<{ key: MediaSortKey; label: string }> = [
  { key: "recently_added", label: "Recently Added" },
  { key: "recently_updated", label: "Recently Updated" },
  { key: "title", label: "Title" },
  { key: "year", label: "Year" },
  { key: "rating", label: "Rating" },
  { key: "recently_finished", label: "Recently Finished" },
];

export function sortMediaItems(items: ReadonlyArray<MediaItem>, sortKey: MediaSortKey): MediaItem[] {
  const sorted = [...items];

  switch (sortKey) {
    case "title":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "year":
      return sorted.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    case "rating":
      return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case "recently_finished":
      return sorted.sort((a, b) => new Date(b.finishedAt ?? 0).getTime() - new Date(a.finishedAt ?? 0).getTime());
    case "recently_updated":
      return sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    case "recently_added":
    default:
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

// Every node in the Goal Tree, flattened - the Library's "Linked Goals"
// picker offers any of them (Dreams through Weekly Milestones), not just
// progress_goal nodes the way Quest's single linkedProgressGoalId does,
// since a book like "The Psychology of Money" more naturally maps to a
// broad Dream ("Financial Discipline") than a numeric progress goal. Reuses
// the existing GoalTree - no new Goal model.
export function flattenGoalNodes(nodes: GoalTree): GoalNode[] {
  return nodes.flatMap((node) => [node, ...flattenGoalNodes(node.children)]);
}
