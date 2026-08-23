"use client";

import { useState } from "react";
import { putDocumentFile } from "../../_lib/document-store";
import { useDocumentPhotoUrl } from "../../_lib/hooks/useDocumentPhotoUrl";
import type { WardrobeItemDraft } from "../../_lib/hooks/useWardrobe";
import type { WardrobeCategory } from "../../_lib/types/player-character";

const CATEGORIES: WardrobeCategory[] = ["top", "bottom", "underwear", "outerwear", "footwear", "accessory", "other"];

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

function generatePhotoId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "photo-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

type WardrobeItemFormProps = Readonly<{
  onSave: (draft: WardrobeItemDraft) => void;
  onCancel: () => void;
}>;

export default function WardrobeItemForm({ onSave, onCancel }: WardrobeItemFormProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<WardrobeCategory>("top");
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [description, setDescription] = useState("");
  const [photoId, setPhotoId] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const previewUrl = useDocumentPhotoUrl(photoId);

  async function handlePhotoUpload(fileList: FileList | null) {
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

  function handleSave() {
    if (!name.trim()) return;
    onSave({ name: name.trim(), category, brand: brand.trim() || undefined, color: color.trim() || undefined, description: description.trim() || undefined, photoId });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-purple-500/25 bg-slate-950/60 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className={labelClass}>Name</span>
          <input type="text" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="Black Hoodie" autoFocus />
        </label>
        <label className="space-y-1.5">
          <span className={labelClass}>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value as WardrobeCategory)} className={inputClass}>
            {CATEGORIES.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className={labelClass}>Brand (optional)</span>
          <input type="text" value={brand} onChange={(event) => setBrand(event.target.value)} className={inputClass} />
        </label>
        <label className="space-y-1.5">
          <span className={labelClass}>Color (optional)</span>
          <input type="text" value={color} onChange={(event) => setColor(event.target.value)} className={inputClass} />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className={labelClass}>Description (optional)</span>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className={inputClass} />
      </label>

      <div className="space-y-2">
        <span className={labelClass}>Photo</span>
        <div className="flex items-center gap-3">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
          ) : null}
          <label className="cursor-pointer rounded-lg border border-dashed border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:border-purple-400/60 hover:text-white">
            {uploading ? "Uploading..." : photoId ? "Replace Photo" : "Upload Photo"}
            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(event) => handlePhotoUpload(event.target.files)} />
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
          disabled={!name.trim()}
          className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
