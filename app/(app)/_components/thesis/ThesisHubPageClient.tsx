"use client";

import Card from "../Card";
import StatCard from "../StatCard";
import ThesisHubNavCard from "./ThesisHubNavCard";
import ManuscriptChapterCard from "./ManuscriptChapterCard";
import WritingCalendar from "./WritingCalendar";
import WritingLogForm from "./WritingLogForm";
import LinkedMetricGoalCard from "../goal-tree/LinkedMetricGoalCard";
import { useThesisDashboard } from "../../_lib/hooks/useThesisDashboard";
import { useExperimentEntries } from "../../_lib/hooks/useExperimentEntries";
import { useManuscript } from "../../_lib/hooks/useManuscript";
import { useWritingLogEntries } from "../../_lib/hooks/useWritingLogEntries";
import { MANUSCRIPT_CHAPTER_ORDER } from "../../_lib/types/manuscript";
import { getAveragePagesPerDay, getBestWritingDay, getPagesWrittenThisMonth, getPagesWrittenThisWeek, getPagesWrittenToday, getTotalPagesWritten } from "../../_lib/engines/thesis-engine";
import type { TimelineItem } from "../../_lib/types/thesis-dashboard";

function nearestUpcomingDeadlineLabel(timeline: ReadonlyArray<TimelineItem>, fallback: string) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const upcoming = timeline
    .filter((item) => item.kind === "Deadline" && item.date >= todayKey)
    .sort((first, second) => first.date.localeCompare(second.date))[0];

  if (upcoming) {
    return `${upcoming.title || "Deadline"} · ${new Date(`${upcoming.date}T00:00:00`).toLocaleDateString()}`;
  }

  return fallback || "Not set";
}

export default function ThesisHubPageClient() {
  const { dashboard, hasLoaded: dashboardLoaded } = useThesisDashboard();
  const { entries: experiments, hasLoaded: experimentsLoaded } = useExperimentEntries();
  const { manuscript, hasLoaded: manuscriptLoaded } = useManuscript();
  const { entries: writingLog, setEntries: setWritingLog, hasLoaded: writingLogLoaded } = useWritingLogEntries();

  if (!dashboardLoaded || !experimentsLoaded || !manuscriptLoaded || !writingLogLoaded) {
    return null;
  }

  const overallProgress = Math.round((dashboard.progress.research + dashboard.progress.writing) / 2);
  const chaptersStarted = MANUSCRIPT_CHAPTER_ORDER.filter((key) => manuscript[key].status !== "Not Started").length;
  const totalPagesWritten = getTotalPagesWritten(writingLog);
  const pagesThisWeek = getPagesWrittenThisWeek(writingLog);
  const pagesToday = getPagesWrittenToday(writingLog);
  const pagesThisMonth = getPagesWrittenThisMonth(writingLog);
  const averagePagesPerDay = getAveragePagesPerDay(writingLog);
  const bestWritingDay = getBestWritingDay(writingLog);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-500/20 bg-slate-950/45 p-5 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Atlas</p>
        <h1 className="mt-2 text-3xl font-black text-white">🎓 {dashboard.info.title || "Thesis Hub"}</h1>
        <p className="mt-2 text-sm text-slate-400">Your MSc thesis, from research to final submission - one workspace, nothing extra.</p>
      </div>

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Overview</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Overall Progress" value={`${overallProgress}%`} accentClass="text-cyan-300" />
          <StatCard label="Current Milestone" value={dashboard.currentFocus.nextMilestone || "Not set"} accentClass="text-cyan-300" />
          <StatCard label="Next Task" value={dashboard.currentFocus.currentTask || "Not set"} accentClass="text-cyan-300" />
          <StatCard label="Thesis Deadline" value={nearestUpcomingDeadlineLabel(dashboard.timeline, dashboard.info.expectedGraduation)} accentClass="text-cyan-300" />
          <StatCard label="Total Pages Written" value={totalPagesWritten} accentClass="text-cyan-300" />
          <StatCard label="Chapters Complete" value={`${chaptersStarted}/${MANUSCRIPT_CHAPTER_ORDER.length}`} accentClass="text-cyan-300" />
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Chapters</p>
        <h2 className="mt-2 text-xl font-black text-white">Chapter progress</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MANUSCRIPT_CHAPTER_ORDER.map((key) => (
            <ManuscriptChapterCard key={key} chapterKey={key} chapter={manuscript[key]} />
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Pages Written</p>
        <h2 className="mt-2 text-xl font-black text-white">Log today&rsquo;s output</h2>
        <div className="mt-4">
          <WritingLogForm onLog={(entry) => setWritingLog((current) => [...current, entry])} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="This Week" value={pagesThisWeek} accentClass="text-cyan-300" />
          <StatCard label="This Month" value={pagesThisMonth} accentClass="text-cyan-300" />
          <StatCard label="Average / Day" value={averagePagesPerDay} accentClass="text-cyan-300" />
          <StatCard label="Best Day" value={bestWritingDay ? `${bestWritingDay.pages} pages` : "—"} detail={bestWritingDay ? new Date(`${bestWritingDay.date}T00:00:00`).toLocaleDateString() : undefined} accentClass="text-cyan-300" />
        </div>
      </Card>

      <LinkedMetricGoalCard
        metricId="thesis-pages-written"
        thisWeekValue={pagesThisWeek}
        todayValue={pagesToday}
        accentClass="text-cyan-300"
        defaultTitle="Write the thesis"
        defaultTargetValue={80}
      />

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Writing Calendar</p>
        <h2 className="mt-2 text-xl font-black text-white">Daily output</h2>
        <p className="mt-1 text-sm text-slate-400">The same records that drive the goal above - edit or delete a day&rsquo;s entries and the goal updates immediately.</p>
        <div className="mt-5">
          <WritingCalendar
            entries={writingLog}
            onUpdateEntry={(id, pages) => setWritingLog((current) => current.map((entry) => (entry.id === id ? { ...entry, pages } : entry)))}
            onDeleteEntry={(id) => setWritingLog((current) => current.filter((entry) => entry.id !== id))}
          />
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
