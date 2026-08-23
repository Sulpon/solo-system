"use client";

import { useDocumentPhotoUrl } from "../../_lib/hooks/useDocumentPhotoUrl";
import { CHARACTER_VIEWS } from "../../_lib/types/player-character";
import type { CharacterView, EquippedItems, Hairstyle, ReferencePhoto, WardrobeItem } from "../../_lib/types/player-character";

type CharacterViewerProps = Readonly<{
  view: CharacterView;
  onChangeView: (view: CharacterView) => void;
  referencePhotos: ReadonlyArray<ReferencePhoto>;
  equippedItems: EquippedItems;
  wardrobeItems: ReadonlyArray<WardrobeItem>;
  activeHairstyle: Hairstyle | null;
  level: number;
  rank: string;
}>;

const VIEW_LABELS: Record<CharacterView, string> = { front: "Front", left: "Left Side", back: "Back", right: "Right Side" };

function CurrentReferencePhoto({ photoId }: Readonly<{ photoId: string }>) {
  const url = useDocumentPhotoUrl(photoId);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="Character reference" className="h-full w-full object-cover" />
  ) : (
    <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">Loading photo...</div>
  );
}

export default function CharacterViewer({ view, onChangeView, referencePhotos, equippedItems, wardrobeItems, activeHairstyle, level, rank }: CharacterViewerProps) {
  const currentIndex = CHARACTER_VIEWS.indexOf(view);
  const photo = referencePhotos.find((entry) => entry.slot === view) ?? null;

  const equippedNames = Object.values(equippedItems)
    .filter((id): id is string => Boolean(id))
    .map((id) => wardrobeItems.find((item) => item.id === id)?.name)
    .filter((name): name is string => Boolean(name));

  function step(direction: 1 | -1) {
    const nextIndex = (currentIndex + direction + CHARACTER_VIEWS.length) % CHARACTER_VIEWS.length;
    onChangeView(CHARACTER_VIEWS[nextIndex]);
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex w-full items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous view"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-purple-500/30 bg-slate-950/70 text-xl text-purple-200 transition hover:border-purple-400/60 hover:text-white"
        >
          ←
        </button>

        <div className="relative aspect-[3/4] w-full max-w-xs overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-b from-slate-900/80 to-slate-950 shadow-[0_0_45px_rgba(124,58,237,0.18)]">
          {photo ? (
            <CurrentReferencePhoto photoId={photo.photoId} />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
              <span className="text-sm font-semibold text-slate-400">No {VIEW_LABELS[view]} reference photo yet</span>
              <span className="text-xs text-slate-600">Upload one in Reference Photos</span>
            </div>
          )}
          <div className="absolute left-3 top-3 rounded-full border border-purple-400/40 bg-slate-950/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-purple-200">
            {VIEW_LABELS[view]}
          </div>
        </div>

        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next view"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-purple-500/30 bg-slate-950/70 text-xl text-purple-200 transition hover:border-purple-400/60 hover:text-white"
        >
          →
        </button>
      </div>

      <div className="flex items-center gap-2">
        {CHARACTER_VIEWS.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => onChangeView(entry)}
            aria-label={`Switch to ${VIEW_LABELS[entry]} view`}
            className={"h-2 w-2 rounded-full transition " + (entry === view ? "bg-purple-400" : "bg-slate-700 hover:bg-slate-500")}
          />
        ))}
      </div>

      <div className="flex items-end gap-6 rounded-2xl border border-slate-800 bg-slate-950/55 px-6 py-3">
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Level</p>
          <p className="text-2xl font-black text-white">{level}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Rank</p>
          <p className="text-2xl font-black text-purple-300">{rank}</p>
        </div>
      </div>

      <div className="text-center text-xs text-slate-500">
        <p>Hair: {activeHairstyle?.name ?? "Not set"}</p>
        <p>Wearing: {equippedNames.length > 0 ? equippedNames.join(", ") : "Nothing equipped"}</p>
      </div>
    </div>
  );
}
