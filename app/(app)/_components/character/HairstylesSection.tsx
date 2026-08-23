"use client";

import { useState } from "react";
import { useDocumentPhotoUrl } from "../../_lib/hooks/useDocumentPhotoUrl";
import type { HairstyleDraft } from "../../_lib/hooks/useHairstyles";
import type { Hairstyle } from "../../_lib/types/player-character";
import HairstyleForm from "./HairstyleForm";

type HairstylesSectionProps = Readonly<{
  hairstyles: ReadonlyArray<Hairstyle>;
  onAdd: (draft: HairstyleDraft) => void;
  onDelete: (id: string) => void;
  onSetActive: (id: string) => void;
}>;

function HairstyleThumbnail({ photoId }: Readonly<{ photoId: string }>) {
  const url = useDocumentPhotoUrl(photoId);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
  ) : (
    <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-800" />
  );
}

export default function HairstylesSection({ hairstyles, onAdd, onDelete, onSetActive }: HairstylesSectionProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Hairstyles</p>
        {!showForm ? (
          <button type="button" onClick={() => setShowForm(true)} className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
            + Add Hairstyle
          </button>
        ) : null}
      </div>

      {showForm ? (
        <HairstyleForm
          onSave={(draft) => {
            onAdd(draft);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      ) : null}

      <div className="space-y-2">
        {hairstyles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/45 p-4 text-center text-sm text-slate-400">No hairstyles saved yet.</div>
        ) : (
          hairstyles.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5">
              {entry.photoId ? <HairstyleThumbnail photoId={entry.photoId} /> : <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-800" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{entry.name}</p>
                {entry.notes ? <p className="truncate text-xs text-slate-500">{entry.notes}</p> : null}
              </div>
              {entry.isActive ? (
                <span className="shrink-0 rounded-lg border border-emerald-400/50 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200">Current</span>
              ) : (
                <button type="button" onClick={() => onSetActive(entry.id)} className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-purple-400/60 hover:text-white">
                  Set Current
                </button>
              )}
              <button type="button" onClick={() => onDelete(entry.id)} className="shrink-0 text-xs text-rose-300 hover:text-rose-200">
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
