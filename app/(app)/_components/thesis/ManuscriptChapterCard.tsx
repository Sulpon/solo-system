"use client";

import Link from "next/link";
import { MANUSCRIPT_CHAPTER_TITLES } from "../../_lib/types/manuscript";
import type { ManuscriptChapter, ManuscriptChapterKey, ManuscriptChapterStatus } from "../../_lib/types/manuscript";

type ManuscriptChapterCardProps = Readonly<{
  chapterKey: ManuscriptChapterKey;
  chapter: ManuscriptChapter;
}>;

const statusAccent: Record<ManuscriptChapterStatus, string> = {
  "Not Started": "border-slate-700 bg-slate-800/60 text-slate-300",
  Drafting: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
  "In Review": "border-amber-500/40 bg-amber-500/10 text-amber-200",
  Final: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
};

export default function ManuscriptChapterCard({ chapterKey, chapter }: ManuscriptChapterCardProps) {
  return (
    <Link href={`/thesis-hub/manuscript/${chapterKey}`} className="block rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-purple-400/50 hover:bg-slate-900/40">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-white">{MANUSCRIPT_CHAPTER_TITLES[chapterKey]}</p>
        <span className={"shrink-0 rounded-lg border px-2 py-0.5 text-xs font-semibold " + statusAccent[chapter.status]}>{chapter.status}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-slate-500">{chapter.draft ? `${chapter.draft.trim().split(/\s+/).length} words drafted` : "No draft yet."}</p>
    </Link>
  );
}
