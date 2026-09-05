"use client";

import { useState } from "react";
import Modal from "../Modal";
import { putDocumentFile } from "../../_lib/document-store";
import { useDocumentPhotoUrl } from "../../_lib/hooks/useDocumentPhotoUrl";

function generatePhotoId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "photo-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

type ChallengePhotoModalProps = Readonly<{
  metricName: string;
  date: string;
  initialPhotoId?: string;
  onSave: (photoId: string | undefined) => void;
  onClose: () => void;
}>;

export default function ChallengePhotoModal({ metricName, date, initialPhotoId, onSave, onClose }: ChallengePhotoModalProps) {
  const [photoId, setPhotoId] = useState(initialPhotoId);
  const [uploading, setUploading] = useState(false);
  const previewUrl = useDocumentPhotoUrl(photoId);

  async function handleUpload(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const id = generatePhotoId();
      await putDocumentFile(id, file);
      setPhotoId(id);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal title={metricName} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{date}</p>

        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="max-h-80 w-full rounded-xl border border-slate-800 object-contain" />
        ) : (
          <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/45 text-sm text-slate-500">No photo yet</div>
        )}

        <div className="flex items-center gap-3">
          <label className="cursor-pointer rounded-lg border border-dashed border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:border-purple-400/60 hover:text-white">
            {uploading ? "Uploading..." : photoId ? "Replace Photo" : "Upload Photo"}
            <input type="file" accept="image/*" capture="environment" className="hidden" disabled={uploading} onChange={(event) => handleUpload(event.target.files)} />
          </label>
          {photoId ? (
            <button type="button" onClick={() => setPhotoId(undefined)} className="text-xs text-rose-300 hover:text-rose-200">
              Remove
            </button>
          ) : null}
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(photoId)}
            className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
