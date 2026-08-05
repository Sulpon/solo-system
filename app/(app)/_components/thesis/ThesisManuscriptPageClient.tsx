"use client";

import Card from "../Card";
import ThesisHubBackLink from "./ThesisHubBackLink";
import ManuscriptChapterCard from "./ManuscriptChapterCard";
import { useManuscript } from "../../_lib/hooks/useManuscript";
import { MANUSCRIPT_CHAPTER_ORDER } from "../../_lib/types/manuscript";

export default function ThesisManuscriptPageClient() {
  const { manuscript, hasLoaded } = useManuscript();

  if (!hasLoaded) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-500/20 bg-slate-950/45 p-5 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <ThesisHubBackLink />
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Thesis Hub</p>
        <h1 className="mt-2 text-3xl font-black text-white">📝 Manuscript</h1>
        <p className="mt-2 text-sm text-slate-400">The thesis document itself - writing only. Research notes and findings live on the Research page.</p>
      </div>

      <Card className="p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MANUSCRIPT_CHAPTER_ORDER.map((key) => (
            <ManuscriptChapterCard key={key} chapterKey={key} chapter={manuscript[key]} />
          ))}
        </div>
      </Card>
    </div>
  );
}
