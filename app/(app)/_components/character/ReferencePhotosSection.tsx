"use client";

import { useState } from "react";
import { putDocumentFile } from "../../_lib/document-store";
import { useDocumentPhotoUrl } from "../../_lib/hooks/useDocumentPhotoUrl";
import { CHARACTER_VIEWS } from "../../_lib/types/player-character";
import type { CharacterView, ReferencePhoto } from "../../_lib/types/player-character";

const VIEW_LABELS: Record<CharacterView, string> = { front: "Front", left: "Left Side", back: "Back", right: "Right Side" };

function generatePhotoId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "photo-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

type ReferencePhotosSectionProps = Readonly<{
  photos: ReadonlyArray<ReferencePhoto>;
  onSetSlotPhoto: (slot: CharacterView, photoId: string) => void;
  onRemoveSlotPhoto: (slot: CharacterView) => void;
}>;

function SlotPreview({ photoId }: Readonly<{ photoId: string }>) {
  const url = useDocumentPhotoUrl(photoId);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="h-full w-full object-cover" />
  ) : (
    <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">Loading...</div>
  );
}

export default function ReferencePhotosSection({ photos, onSetSlotPhoto, onRemoveSlotPhoto }: ReferencePhotosSectionProps) {
  const [uploadingSlot, setUploadingSlot] = useState<CharacterView | null>(null);

  async function handleUpload(slot: CharacterView, fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    setUploadingSlot(slot);
    try {
      const id = generatePhotoId();
      await putDocumentFile(id, file);
      onSetSlotPhoto(slot, id);
    } finally {
      setUploadingSlot(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Reference Photos</p>
      <p className="text-xs text-slate-500">Your real photos, stored only on this device. Distinct from any future generated avatar — these are never overwritten automatically.</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CHARACTER_VIEWS.map((slot) => {
          const photo = photos.find((entry) => entry.slot === slot) ?? null;

          return (
            <div key={slot} className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{VIEW_LABELS[slot]}</p>
              <div className="aspect-[3/4] overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
                {photo ? (
                  <SlotPreview photoId={photo.photoId} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-slate-500">No {VIEW_LABELS[slot]} photo yet — upload one</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer rounded-lg border border-dashed border-slate-700 px-2 py-1.5 text-center text-xs text-slate-400 transition hover:border-purple-400/60 hover:text-white">
                  {uploadingSlot === slot ? "Uploading..." : photo ? "Replace" : "Upload"}
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingSlot === slot} onChange={(event) => handleUpload(slot, event.target.files)} />
                </label>
                {photo ? (
                  <button type="button" onClick={() => onRemoveSlotPhoto(slot)} className="rounded-lg border border-slate-700 px-2 py-1.5 text-xs text-rose-300 transition hover:text-rose-200">
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
