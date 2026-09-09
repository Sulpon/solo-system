"use client";

import { getStatusLabel, getTypeLabel } from "../../_lib/engines/library-engine";
import type { MediaItem } from "../../_lib/types/media-item";
import MediaCoverImage from "./MediaCoverImage";
import MediaStars from "./MediaStars";

const STATUS_BADGE_STYLE: Record<MediaItem["status"], string> = {
  reading: "border-cyan-400/40 bg-cyan-500/10 text-cyan-200",
  watching: "border-cyan-400/40 bg-cyan-500/10 text-cyan-200",
  planned: "border-slate-600 bg-slate-800/60 text-slate-300",
  finished: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  dropped: "border-rose-400/30 bg-rose-500/10 text-rose-200/80",
};

type MediaCardProps = Readonly<{
  item: MediaItem;
  onOpen: () => void;
}>;

export default function MediaCard({ item, onOpen }: MediaCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/55 text-left transition hover:border-cyan-400/40 hover:shadow-[0_0_30px_rgba(34,211,238,0.12)]"
    >
      <div className="aspect-[2/3] w-full overflow-hidden bg-slate-900">
        <MediaCoverImage coverImageId={item.coverImageId} type={item.type} title={item.title} className="transition duration-200 group-hover:scale-[1.03]" />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{getTypeLabel(item.type)}</p>
        <p className="line-clamp-2 text-sm font-bold text-white">{item.title}</p>
        {item.creator ? <p className="truncate text-xs text-slate-400">{item.creator}</p> : null}
        {item.year ? <p className="text-xs text-slate-500">{item.year}</p> : null}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <MediaStars rating={item.rating} />
          <span className={"shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] " + STATUS_BADGE_STYLE[item.status]}>{getStatusLabel(item.status)}</span>
        </div>
      </div>
    </button>
  );
}
