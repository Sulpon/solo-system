"use client";

import { useState } from "react";
import { putDocumentFile } from "../../_lib/document-store";
import { useDocumentPhotoUrl } from "../../_lib/hooks/useDocumentPhotoUrl";
import { getAvailableStatuses, getInProgressStatus, getStatusLabel, getTypeLabel } from "../../_lib/engines/library-engine";
import { MEDIA_TYPES } from "../../_lib/types/media-item";
import type { MediaDraft } from "../../_lib/hooks/useLibrary";
import type { MediaItem, MediaStatus, MediaType } from "../../_lib/types/media-item";
import MediaStars from "./MediaStars";

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500";

function generatePhotoId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "photo-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function toDateInputValue(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fromDateInputValue(value: string): string | undefined {
  if (!value) return undefined;
  return new Date(`${value}T00:00:00`).toISOString();
}

type MediaFormProps = Readonly<{
  existingItem: MediaItem | null;
  onSave: (draft: MediaDraft) => void;
  onCancel: () => void;
}>;

// One form for both Create and Edit (section 13 of the spec) - the only
// difference is whether existingItem is null. Every field but Type/Title/
// Status is optional, matching "minimum required: Type, Title, Status."
export default function MediaForm({ existingItem, onSave, onCancel }: MediaFormProps) {
  const [type, setType] = useState<MediaType>(existingItem?.type ?? "book");
  const [title, setTitle] = useState(existingItem?.title ?? "");
  const [creator, setCreator] = useState(existingItem?.creator ?? "");
  const [year, setYear] = useState(existingItem?.year ? String(existingItem.year) : "");
  const [genresInput, setGenresInput] = useState((existingItem?.genres ?? []).join(", "));
  const [status, setStatus] = useState<MediaStatus>(existingItem?.status ?? "planned");
  const [rating, setRating] = useState<number | undefined>(existingItem?.rating);
  const [startedAt, setStartedAt] = useState(toDateInputValue(existingItem?.startedAt));
  const [finishedAt, setFinishedAt] = useState(toDateInputValue(existingItem?.finishedAt));
  const [description, setDescription] = useState(existingItem?.description ?? "");
  const [myDescription, setMyDescription] = useState(existingItem?.myDescription ?? "");
  const [whatILearned, setWhatILearned] = useState(existingItem?.whatILearned ?? "");
  const [coverImageId, setCoverImageId] = useState<string | undefined>(existingItem?.coverImageId);
  const [uploading, setUploading] = useState(false);
  const previewUrl = useDocumentPhotoUrl(coverImageId);

  const availableStatuses = getAvailableStatuses(type);

  function handleTypeChange(nextType: MediaType) {
    setType(nextType);
    // A book can never be "watching" and a movie/series can never be
    // "reading" - swap to the new type's equivalent in-progress status
    // rather than leaving an invalid combination. Planned/Finished/Dropped
    // need no change, they apply to every type.
    setStatus((current) => (current === "reading" || current === "watching" ? getInProgressStatus(nextType) : current));
  }

  async function handleCoverUpload(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const id = generatePhotoId();
      await putDocumentFile(id, file);
      setCoverImageId(id);
    } finally {
      setUploading(false);
    }
  }

  function handleSave() {
    if (!title.trim()) return;

    const genres = genresInput
      .split(",")
      .map((genre) => genre.trim())
      .filter(Boolean);
    const parsedYear = Number.parseInt(year, 10);

    onSave({
      type,
      title: title.trim(),
      creator: creator.trim() || undefined,
      year: Number.isFinite(parsedYear) && year.trim() ? parsedYear : undefined,
      genres: genres.length > 0 ? genres : undefined,
      status,
      rating,
      startedAt: fromDateInputValue(startedAt),
      finishedAt: fromDateInputValue(finishedAt),
      description: description.trim() || undefined,
      myDescription: myDescription.trim() || undefined,
      whatILearned: whatILearned.trim() || undefined,
      coverImageId,
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <span className={labelClass}>Type</span>
        <div className="flex gap-2">
          {MEDIA_TYPES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleTypeChange(option)}
              className={
                "rounded-xl border px-4 py-2 text-sm font-semibold transition " +
                (type === option ? "border-cyan-400/60 bg-cyan-500/15 text-white" : "border-slate-700 bg-slate-950/60 text-slate-400 hover:border-cyan-400/40 hover:text-white")
              }
            >
              {getTypeLabel(option)}
            </button>
          ))}
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className={labelClass}>Title</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus className={inputClass} />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className={labelClass}>Creator (optional)</span>
          <input value={creator} onChange={(event) => setCreator(event.target.value)} placeholder={type === "book" ? "Author" : "Director"} className={inputClass} />
        </label>
        <label className="space-y-1.5">
          <span className={labelClass}>Year (optional)</span>
          <input value={year} onChange={(event) => setYear(event.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" maxLength={4} className={inputClass} />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className={labelClass}>Genre (optional)</span>
        <input value={genresInput} onChange={(event) => setGenresInput(event.target.value)} placeholder="comma, separated, genres" className={inputClass} />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className={labelClass}>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as MediaStatus)} className={inputClass}>
            {availableStatuses.map((option) => (
              <option key={option} value={option}>
                {getStatusLabel(option)}
              </option>
            ))}
          </select>
        </label>
        <div className="space-y-1.5">
          <span className={labelClass}>My Rating (optional)</span>
          <div className="flex h-[38px] items-center">
            <MediaStars rating={rating} onRate={setRating} size="md" />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className={labelClass}>{type === "book" ? "Reading Started" : "Watching Started"} (optional)</span>
          <input type="date" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} className={inputClass} />
        </label>
        <label className="space-y-1.5">
          <span className={labelClass}>Finished (optional)</span>
          <input type="date" value={finishedAt} onChange={(event) => setFinishedAt(event.target.value)} className={inputClass} />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className={labelClass}>Description (optional)</span>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} placeholder="What this is about." className={inputClass} />
      </label>

      <label className="block space-y-1.5">
        <span className={labelClass}>My Description (optional)</span>
        <textarea value={myDescription} onChange={(event) => setMyDescription(event.target.value)} rows={2} placeholder="What it was actually about, to you." className={inputClass} />
      </label>

      <label className="block space-y-1.5">
        <span className={labelClass}>What I Learned (optional)</span>
        <textarea value={whatILearned} onChange={(event) => setWhatILearned(event.target.value)} rows={3} placeholder="Lessons, ideas, principles, quotes worth remembering." className={inputClass} />
      </label>

      <div className="space-y-2">
        <span className={labelClass}>Cover (optional)</span>
        <div className="flex items-center gap-3">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-20 w-14 rounded-lg object-cover" />
          ) : null}
          <label className="cursor-pointer rounded-lg border border-dashed border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:border-cyan-400/60 hover:text-white">
            {uploading ? "Uploading..." : coverImageId ? "Replace Cover" : "Upload Cover"}
            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(event) => handleCoverUpload(event.target.files)} />
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!title.trim()}
          className="rounded-xl border border-cyan-400/50 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
