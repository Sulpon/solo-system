"use client";

import Card from "../Card";
import ThesisHubNavCard from "./ThesisHubNavCard";
import { useThesisDashboard } from "../../_lib/hooks/useThesisDashboard";
import { useExperimentEntries } from "../../_lib/hooks/useExperimentEntries";
import { useManuscript } from "../../_lib/hooks/useManuscript";
import { MANUSCRIPT_CHAPTER_ORDER } from "../../_lib/types/manuscript";

export default function ThesisHubPageClient() {
  const { dashboard, hasLoaded: dashboardLoaded } = useThesisDashboard();
  const { entries: experiments, hasLoaded: experimentsLoaded } = useExperimentEntries();
  const { manuscript, hasLoaded: manuscriptLoaded } = useManuscript();

  if (!dashboardLoaded || !experimentsLoaded || !manuscriptLoaded) {
    return null;
  }

  const overallProgress = Math.round((dashboard.progress.research + dashboard.progress.writing) / 2);
  const chaptersStarted = MANUSCRIPT_CHAPTER_ORDER.filter((key) => manuscript[key].status !== "Not Started").length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-500/20 bg-slate-950/45 p-5 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Atlas</p>
        <h1 className="mt-2 text-3xl font-black text-white">🎓 Thesis Hub</h1>
        <p className="mt-2 text-sm text-slate-400">Your MSc thesis, from research to final submission - one workspace, nothing extra.</p>
      </div>

      <Card className="p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Overall Progress</p>
            <p className="mt-1.5 text-2xl font-black text-white">{overallProgress}%</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Experiments Logged</p>
            <p className="mt-1.5 text-2xl font-black text-white">{experiments.length}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Chapters Started</p>
            <p className="mt-1.5 text-2xl font-black text-white">{chaptersStarted}/{MANUSCRIPT_CHAPTER_ORDER.length}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <ThesisHubNavCard href="/thesis-hub/dashboard" emoji="📊" title="Dashboard" description="Thesis info, progress, current focus, and timeline at a glance." />
        <ThesisHubNavCard
          href="/thesis-hub/research"
          emoji="🔬"
          title="Research"
          description="Experiments, research notes, findings, and resources."
          meta={`${experiments.length} experiments`}
        />
        <ThesisHubNavCard
          href="/thesis-hub/manuscript"
          emoji="📝"
          title="Manuscript"
          description="The thesis document itself, chapter by chapter."
          meta={`${chaptersStarted}/${MANUSCRIPT_CHAPTER_ORDER.length} chapters started`}
        />
      </div>
    </div>
  );
}
