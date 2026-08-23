"use client";

import { getDungeonImage } from "../../_lib/world-map/dungeon-image";
import type { WorldDungeon } from "../../_lib/types/world-map";

type DungeonImageProps = Readonly<{ dungeon: WorldDungeon; className?: string }>;

// Renders whatever getDungeonImage() returns - today that's always a clean
// stylized fallback (landmark icon + name) plus a reference-photo link,
// since the seed data has no direct hotlinkable photo (see dungeon-image.ts).
// A future real-photo pass only needs to change getDungeonImage's return
// value; this component's shape stays the same.
export default function DungeonImage({ dungeon, className = "" }: DungeonImageProps) {
  const image = getDungeonImage(dungeon);

  return (
    <div className={`relative flex flex-col items-center justify-center gap-2 overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-black text-center ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(251,191,36,0.12),transparent_60%)]" />
      <span className="relative text-5xl">{dungeon.isBoss ? "👑" : "🗺️"}</span>
      <p className="relative px-4 text-sm font-semibold text-slate-200">{image.alt}</p>
      <a
        href={image.searchUrl}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => event.stopPropagation()}
        className="relative text-xs text-purple-300 underline decoration-purple-400/40 underline-offset-2 hover:text-purple-200"
      >
        View reference photos ({image.source}) ↗
      </a>
    </div>
  );
}
