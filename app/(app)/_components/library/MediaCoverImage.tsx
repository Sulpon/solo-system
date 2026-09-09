"use client";

import { useDocumentPhotoUrl } from "../../_lib/hooks/useDocumentPhotoUrl";
import type { MediaType } from "../../_lib/types/media-item";

type MediaCoverImageProps = Readonly<{
  coverImageId?: string;
  type: MediaType;
  title: string;
  className?: string;
}>;

const PLACEHOLDER_STYLE: Record<MediaType, string> = {
  book: "from-cyan-500/20 to-slate-950 text-cyan-300",
  movie: "from-purple-500/20 to-slate-950 text-purple-300",
  series: "from-emerald-500/20 to-slate-950 text-emerald-300",
};

// One glyph per type - deliberately not the Quest keyword-icon system
// (QuestIcon.tsx), which picks an icon from a quest's title text and has no
// concept of "this media has no cover yet." Section 18 of the spec: a clean
// generated placeholder, not an external-API poster fetch.
function TypeGlyph({ type }: { type: MediaType }) {
  if (type === "book") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
        <path d="M4 5.5C4 4.67 4.67 4 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M20 5.5c0-.83-.67-1.5-1.5-1.5H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "movie") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
        <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 5.5v13M16 5.5v13M3.5 9.5H8M3.5 14.5H8M16 9.5h4.5M16 14.5h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
      <rect x="3" y="5.5" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 20.5h6M12 17.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function MediaCoverImage({ coverImageId, type, title, className = "" }: MediaCoverImageProps) {
  const url = useDocumentPhotoUrl(coverImageId);

  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={title} className={"h-full w-full object-cover " + className} />;
  }

  return (
    <div className={"flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-b p-4 text-center " + PLACEHOLDER_STYLE[type] + " " + className}>
      <TypeGlyph type={type} />
      <p className="line-clamp-3 text-xs font-semibold text-slate-300">{title}</p>
    </div>
  );
}
