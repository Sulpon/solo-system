"use client";

import { useState } from "react";
import { putDocumentFile, deleteDocumentFile } from "../../_lib/document-store";
import type { DailyJournalEntry, JournalPhoto } from "../../_lib/types/journal";
import type { JournalEntryDraft } from "../../_lib/hooks/useJournalEntries";

type JournalEntryEditorProps = Readonly<{
  dateLabel: string;
  existingEntry: DailyJournalEntry | null;
  onSave: (draft: JournalEntryDraft) => void;
  onCancel: () => void;
}>;

const SUPPORTING_PROMPTS = ["What was the most memorable thing?", "What did you accomplish?", "What did you learn?", "How did you feel?"];

function generatePhotoId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "photo-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export default function JournalEntryEditor({ dateLabel, existingEntry, onSave, onCancel }: JournalEntryEditorProps) {
  const [text, setText] = useState(existingEntry?.text ?? "");
  const [photos, setPhotos] = useState<ReadonlyArray<JournalPhoto>>(existingEntry?.photos ?? []);
  const [tagsInput, setTagsInput] = useState((existingEntry?.tags ?? []).join(", "));
  const [uploading, setUploading] = useState(false);

  async function handlePhotoUpload(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    try {
      const id = generatePhotoId();
      await putDocumentFile(id, file);
      const photo: JournalPhoto = { id, fileName: file.name, fileType: file.type, fileSize: file.size, uploadedAt: new Date().toISOString() };
      setPhotos((current) => [...current, photo]);
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto(photoId: string) {
    await deleteDocumentFile(photoId).catch(() => {});
    setPhotos((current) => current.filter((photo) => photo.id !== photoId));
  }

  function handleSave() {
    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    onSave({ text: text.trim(), photos, tags: tags.length > 0 ? tags : undefined });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-purple-500/25 bg-slate-950/60 p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">{dateLabel}</p>
        <label className="mt-3 block space-y-2">
          <span className="text-sm font-semibold text-white">What happened today?</span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={5}
            autoFocus
            placeholder="Write a few sentences..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-purple-400"
          />
        </label>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
          {SUPPORTING_PROMPTS.map((prompt) => (
            <span key={prompt}>{prompt}</span>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Photos</span>
        <div className="flex flex-wrap gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs text-slate-300">
              <span className="truncate max-w-[10rem]">{photo.fileName}</span>
              <button type="button" onClick={() => removePhoto(photo.id)} className="text-rose-300 hover:text-rose-200">
                Remove
              </button>
            </div>
          ))}
          <label className="cursor-pointer rounded-lg border border-dashed border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:border-purple-400/60 hover:text-white">
            {uploading ? "Uploading..." : "Add Photo"}
            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(event) => handlePhotoUpload(event.target.files)} />
          </label>
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tags (optional)</span>
        <input
          type="text"
          value={tagsInput}
          onChange={(event) => setTagsInput(event.target.value)}
          placeholder="comma, separated, tags"
          className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400"
        />
      </label>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
          Cancel
        </button>
        <button type="button" onClick={handleSave} disabled={!text.trim() && photos.length === 0} className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-40">
          Save
        </button>
      </div>
    </div>
  );
}
