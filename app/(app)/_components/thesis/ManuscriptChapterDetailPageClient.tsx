"use client";

import Link from "next/link";
import Card from "../Card";
import { useManuscript } from "../../_lib/hooks/useManuscript";
import { MANUSCRIPT_CHAPTER_STATUSES, MANUSCRIPT_CHAPTER_TITLES, isManuscriptChapterKey } from "../../_lib/types/manuscript";
import type { ManuscriptChapter, ManuscriptChapterKey, ManuscriptChapterStatus } from "../../_lib/types/manuscript";

type ManuscriptChapterDetailPageClientProps = Readonly<{ chapterKey: string }>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";
const sectionLabelClass = "text-xs font-semibold uppercase tracking-[0.22em] text-purple-300";

export default function ManuscriptChapterDetailPageClient({ chapterKey }: ManuscriptChapterDetailPageClientProps) {
  const { manuscript, setManuscript, hasLoaded } = useManuscript();

  if (!hasLoaded) {
    return null;
  }

  if (!isManuscriptChapterKey(chapterKey)) {
    return (
      <Card className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center">
        <p className={sectionLabelClass}>Chapter Not Found</p>
        <h1 className="mt-3 text-2xl font-black text-white">This chapter doesn&rsquo;t exist</h1>
        <Link
          href="/thesis-hub/manuscript"
          className="mt-5 inline-block rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
        >
          ← Back to Manuscript
        </Link>
      </Card>
    );
  }

  const key: ManuscriptChapterKey = chapterKey;
  const chapter = manuscript[key];

  function update(patch: Partial<ManuscriptChapter>) {
    setManuscript((current) => ({ ...current, [key]: { ...current[key], ...patch } }));
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-500/20 bg-slate-950/45 p-5 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <Link
          href="/thesis-hub/manuscript"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-purple-300"
        >
          ← Manuscript
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={sectionLabelClass}>Chapter</p>
            <h1 className="mt-2 text-3xl font-black text-white">{MANUSCRIPT_CHAPTER_TITLES[key]}</h1>
          </div>
          <div className="flex gap-3">
            <label className="space-y-2">
              <span className={labelClass}>Status</span>
              <select value={chapter.status} onChange={(event) => update({ status: event.target.value as ManuscriptChapterStatus })} className={inputClass}>
                {MANUSCRIPT_CHAPTER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className={labelClass}>Target Pages</span>
              <input
                type="number"
                min={0}
                step="1"
                value={chapter.targetPages ?? ""}
                onChange={(event) => update({ targetPages: event.target.value.trim() === "" ? undefined : Number(event.target.value) })}
                className={inputClass + " w-28"}
                placeholder="Optional"
              />
            </label>
          </div>
        </div>
      </div>

      <Card className="p-5">
        <p className={labelClass}>Draft</p>
        <textarea value={chapter.draft} onChange={(event) => update({ draft: event.target.value })} className={inputClass + " mt-3 min-h-96"} placeholder="Write the chapter here..." />
      </Card>

      <Card className="p-5">
        <p className={labelClass}>Notes</p>
        <textarea value={chapter.notes} onChange={(event) => update({ notes: event.target.value })} className={inputClass + " mt-3 min-h-24"} placeholder="Things to remember while writing this chapter..." />
      </Card>

      <Card className="p-5">
        <p className={labelClass}>Reviewer Comments</p>
        <textarea
          value={chapter.reviewerComments}
          onChange={(event) => update({ reviewerComments: event.target.value })}
          className={inputClass + " mt-3 min-h-24"}
          placeholder="Feedback from your supervisor or reviewers..."
        />
      </Card>
    </div>
  );
}
