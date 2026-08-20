"use client";

import { useMemo } from "react";
import Link from "next/link";
import Card from "../Card";
import PageHeader from "../PageHeader";
import AttributeListCard from "../AttributeListCard";
import AttributeActivityCard from "../AttributeActivityCard";
import CustomizablePage from "../page-edit/CustomizablePage";
import { getCatalogWidgetsForPage } from "../../_lib/widgets/catalog-registry";
import { getAttributePortfolio } from "../../_lib/attribute-portfolio";
import { useAttributes } from "../../_lib/hooks/useAttributes";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { useCategoryProgression } from "../../_lib/hooks/use-category-progression";
import { useProgression } from "../../_lib/hooks/useProgression";
import { useThesisDashboard } from "../../_lib/hooks/useThesisDashboard";
import { useManuscript } from "../../_lib/hooks/useManuscript";
import { useWritingLogEntries } from "../../_lib/hooks/useWritingLogEntries";
import { useVacancyEntries } from "../../_lib/hooks/useVacancyEntries";
import { MANUSCRIPT_CHAPTER_ORDER } from "../../_lib/types/manuscript";
import { getTotalPagesWritten } from "../../_lib/engines/thesis-engine";
import { getTotalApplications } from "../../_lib/engines/career-hub-engine";
import type { EditablePageSection } from "../page-edit/types";

const CAREER_ATTRIBUTE_ID = "career";

export default function CareerCommandCenterPage() {
  const { attributes, hasLoaded: hasLoadedAttributes } = useAttributes();
  const { isReady, progression } = useCategoryProgression(CAREER_ATTRIBUTE_ID);
  const { goalTree } = useGoalTree();
  const { questDefinitions, activityEvents } = useProgression();

  const { dashboard: thesisDashboard, hasLoaded: thesisDashboardLoaded } = useThesisDashboard();
  const { manuscript, hasLoaded: manuscriptLoaded } = useManuscript();
  const { entries: writingLog, hasLoaded: writingLogLoaded } = useWritingLogEntries();
  const { entries: vacancies, hasLoaded: vacanciesLoaded } = useVacancyEntries();

  const attribute = attributes.find((item) => item.id === CAREER_ATTRIBUTE_ID);
  const displayName = attribute?.name ?? progression?.name ?? "Career";
  const categoryProgress = progression ?? null;

  const portfolio = useMemo(() => getAttributePortfolio(goalTree, questDefinitions, CAREER_ATTRIBUTE_ID), [goalTree, questDefinitions]);
  const availableWidgets = useMemo(() => getCatalogWidgetsForPage(CAREER_ATTRIBUTE_ID), []);

  const dataReady = thesisDashboardLoaded && manuscriptLoaded && writingLogLoaded && vacanciesLoaded;

  const thesisOverallProgress = dataReady ? Math.round((thesisDashboard.progress.research + thesisDashboard.progress.writing) / 2) : 0;
  const chaptersComplete = dataReady ? MANUSCRIPT_CHAPTER_ORDER.filter((key) => manuscript[key].status === "Final").length : 0;
  const totalPagesWritten = dataReady ? getTotalPagesWritten(writingLog) : 0;
  const thesisSummary = `${thesisOverallProgress}% overall · ${totalPagesWritten} pages written · ${chaptersComplete}/${MANUSCRIPT_CHAPTER_ORDER.length} chapters complete`;

  const totalApplications = dataReady ? getTotalApplications(vacancies) : 0;
  const interviews = dataReady ? vacancies.filter((vacancy) => vacancy.status === "Interview").length : 0;
  const offers = dataReady ? vacancies.filter((vacancy) => vacancy.status === "Offer").length : 0;
  const careerHubSummary = `${totalApplications} applications · ${interviews} interviews · ${offers} offers`;

  const sections = useMemo<EditablePageSection[]>(
    () => [
      {
        id: "career-header",
        title: "Header",
        size: "xl",
        content: (
          <PageHeader
            title={displayName}
            level={isReady ? categoryProgress?.level ?? 1 : 1}
            xp={isReady ? categoryProgress?.xp ?? 0 : 0}
            maxXp={isReady ? categoryProgress?.xpNeededForNextLevel ?? 1 : 1}
            accentClass="text-cyan-300"
          />
        ),
      },
      {
        id: "career-nav-thesis",
        title: "Thesis",
        size: "lg",
        content: (
          <Link href="/thesis-hub" className="block h-full">
            <Card className="flex h-full flex-col p-6">
              <div className="flex items-center justify-between">
                <span className="text-3xl">🎓</span>
                <span className="text-slate-500">→</span>
              </div>
              <h2 className="mt-4 text-xl font-black text-white">Thesis</h2>
              <p className="mt-2 flex-1 text-sm text-slate-400">Research, writing, milestones, and thesis progress.</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">{dataReady ? thesisSummary : "Loading..."}</p>
            </Card>
          </Link>
        ),
      },
      {
        id: "career-nav-career-hub",
        title: "Career Hub",
        size: "lg",
        content: (
          <Link href="/career-hub" className="block h-full">
            <Card className="flex h-full flex-col p-6">
              <div className="flex items-center justify-between">
                <span className="text-3xl">💼</span>
                <span className="text-slate-500">→</span>
              </div>
              <h2 className="mt-4 text-xl font-black text-white">Career Hub</h2>
              <p className="mt-2 flex-1 text-sm text-slate-400">Job search, applications, interviews, and career progress.</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-purple-300">{dataReady ? careerHubSummary : "Loading..."}</p>
            </Card>
          </Link>
        ),
      },
      {
        id: "career-dreams",
        title: "Dreams",
        size: "lg",
        content: (
          <AttributeListCard
            title="Dreams"
            accentClass="text-cyan-300"
            items={portfolio.dreams.map((dream) => ({ id: dream.id, title: dream.title, subtitle: dream.description ?? dream.type.replaceAll("_", " "), progress: dream.progress }))}
            emptyTitle="No career dreams yet"
            emptyDescription="Create a Dream with Career attached to see it appear here."
          />
        ),
      },
      {
        id: "career-goals",
        title: "Goals",
        size: "lg",
        content: (
          <AttributeListCard
            title="Goals"
            accentClass="text-cyan-300"
            items={portfolio.goals.map((goal) => ({ id: goal.id, title: goal.title, subtitle: goal.description ?? goal.type.replaceAll("_", " "), progress: goal.progress }))}
            emptyTitle="No career goals yet"
            emptyDescription="Career goals inherited from a Dream will appear automatically."
          />
        ),
      },
      {
        id: "career-milestones",
        title: "Milestones",
        size: "lg",
        content: (
          <AttributeListCard
            title="Milestones"
            accentClass="text-amber-300"
            items={portfolio.milestones.map((milestone) => ({ id: milestone.id, title: milestone.title, subtitle: milestone.description ?? milestone.type.replaceAll("_", " "), progress: milestone.progress }))}
            emptyTitle="No career milestones yet"
            emptyDescription="Milestones tied to the Career branch will show up here."
          />
        ),
      },
      {
        id: "career-progress-goals",
        title: "Progress Goals",
        size: "lg",
        content: (
          <AttributeListCard
            title="Progress Goals"
            accentClass="text-orange-300"
            items={portfolio.progressGoals.map((goal) => ({
              id: goal.id,
              title: goal.title,
              subtitle: goal.unit ? `${goal.currentValue ?? 0} / ${goal.targetValue ?? 0} ${goal.unit}` : goal.description ?? "Progress goal",
              progress: goal.progress,
            }))}
            emptyTitle="No career progress goals yet"
            emptyDescription="Progress goals under the Career dream will appear here."
          />
        ),
      },
      {
        id: "career-quests",
        title: "Quests",
        size: "lg",
        content: (
          <AttributeListCard
            title="Quests"
            accentClass="text-purple-300"
            items={portfolio.quests.map((quest) => ({ id: quest.id, title: quest.title, subtitle: quest.description ?? "Quest" }))}
            emptyTitle="No career quests yet"
            emptyDescription="Quests linked to Career goals will appear automatically."
          />
        ),
      },
      {
        id: "career-activity",
        title: "Recent Activity",
        size: "lg",
        content: <AttributeActivityCard categoryId={CAREER_ATTRIBUTE_ID} accentClass="text-cyan-300" events={activityEvents} />,
      },
    ],
    [
      activityEvents,
      careerHubSummary,
      categoryProgress?.level,
      categoryProgress?.xp,
      categoryProgress?.xpNeededForNextLevel,
      dataReady,
      displayName,
      isReady,
      portfolio,
      thesisSummary,
    ],
  );

  if (!isReady || !hasLoadedAttributes) {
    return <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-400">Loading career progression...</div>;
  }

  return (
    <CustomizablePage
      pageId={CAREER_ATTRIBUTE_ID}
      title={displayName}
      subtitle="Your career command center - jump into Thesis or Career Hub for the full workspace."
      sections={sections}
      availableWidgets={availableWidgets}
    />
  );
}
