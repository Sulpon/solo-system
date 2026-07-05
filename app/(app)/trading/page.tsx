"use client";

import { useMemo } from "react";
import Card from "../_components/Card";
import AttributeActivityCard from "../_components/AttributeActivityCard";
import CustomizablePage from "../_components/page-edit/CustomizablePage";
import { getPageWidgetSections } from "../_components/page-edit/page-widget-registry";
import PageHeader from "../_components/PageHeader";
import Progress from "../_components/Progress";
import { getAttributePortfolio } from "../_lib/attribute-portfolio";
import { useGoalTree } from "../_lib/hooks/useGoalTree";
import { useCategoryProgression } from "../_lib/hooks/use-category-progression";
import { useProgression } from "../_lib/hooks/useProgression";
import type { EditablePageSection } from "../_components/page-edit/types";

function EmptyStateCard({ title, description }: Readonly<{ title: string; description: string }>) {
  return (
    <Card className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-5">
      <h2 className="text-xl font-bold text-emerald-300">{title}</h2>
      <p className="mt-3 text-sm text-slate-400">{description}</p>
    </Card>
  );
}

function AttributeListCard({
  title,
  accentClass,
  items,
  emptyTitle,
  emptyDescription,
}: Readonly<{
  title: string;
  accentClass: string;
  items: { id: string; title: string; subtitle?: string; progress?: number }[];
  emptyTitle: string;
  emptyDescription: string;
}>) {
  return (
    <Card className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
      <h2 className={"text-xl font-bold " + accentClass}>{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{item.title}</p>
                  {item.subtitle ? <p className="mt-1 text-xs text-slate-500">{item.subtitle}</p> : null}
                </div>
                {typeof item.progress === "number" ? <span className="shrink-0 text-sm font-semibold text-cyan-200">{item.progress}%</span> : null}
              </div>
              {typeof item.progress === "number" ? (
                <Progress value={item.progress} max={100} className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950/80" fillClassName="h-full bg-gradient-to-r from-emerald-400 to-cyan-300" />
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/45 p-4">
            <p className="font-semibold text-white">{emptyTitle}</p>
            <p className="mt-1 text-sm text-slate-400">{emptyDescription}</p>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function Page() {
  const { isReady, progression } = useCategoryProgression("trading");
  const { goalTree } = useGoalTree();
  const { questDefinitions, activityEvents } = useProgression();

  const portfolio = useMemo(() => getAttributePortfolio(goalTree, questDefinitions, "trading"), [goalTree, questDefinitions]);
  const availableWidgets = useMemo(() => getPageWidgetSections("trading"), []);
  const categoryProgress = progression ?? null;

  const sections = useMemo<EditablePageSection[]>(
    () => [
      {
        id: "trading-header",
        title: "Header",
        size: "xl",
        content: (
          <PageHeader
            title={categoryProgress?.name ?? "Trading"}
            level={isReady ? categoryProgress?.level ?? 1 : 1}
            xp={isReady ? categoryProgress?.xp ?? 0 : 0}
            maxXp={isReady ? categoryProgress?.xpNeededForNextLevel ?? 1 : 1}
            accentClass="text-emerald-300"
          />
        ),
      },
      {
        id: "trading-dreams",
        title: "Dreams",
        size: "lg",
        content: <AttributeListCard title="Dreams" accentClass="text-emerald-300" items={portfolio.dreams.map((dream) => ({ id: dream.id, title: dream.title, subtitle: dream.description ?? dream.type.replaceAll("_", " "), progress: dream.progress }))} emptyTitle="No trading dreams yet" emptyDescription="Create a Dream with Trading attached to see it appear here." />,
      },
      {
        id: "trading-goals",
        title: "Goals",
        size: "lg",
        content: <AttributeListCard title="Goals" accentClass="text-cyan-300" items={portfolio.goals.map((goal) => ({ id: goal.id, title: goal.title, subtitle: goal.description ?? goal.type.replaceAll("_", " "), progress: goal.progress }))} emptyTitle="No trading goals yet" emptyDescription="Trading goals inherited from a Dream will appear automatically." />,
      },
      {
        id: "trading-milestones",
        title: "Milestones",
        size: "lg",
        content: <AttributeListCard title="Milestones" accentClass="text-amber-300" items={portfolio.milestones.map((milestone) => ({ id: milestone.id, title: milestone.title, subtitle: milestone.description ?? milestone.type.replaceAll("_", " "), progress: milestone.progress }))} emptyTitle="No trading milestones yet" emptyDescription="Milestones tied to the Trading branch will show up here." />,
      },
      {
        id: "trading-progress-goals",
        title: "Progress Goals",
        size: "lg",
        content: <AttributeListCard title="Progress Goals" accentClass="text-orange-300" items={portfolio.progressGoals.map((goal) => ({ id: goal.id, title: goal.title, subtitle: goal.unit ? `${goal.currentValue ?? 0} / ${goal.targetValue ?? 0} ${goal.unit}` : goal.description ?? "Progress goal", progress: goal.progress }))} emptyTitle="No trading progress goals yet" emptyDescription="Progress goals under the Trading dream will appear here." />,
      },
      {
        id: "trading-quests",
        title: "Quests",
        size: "lg",
        content: <AttributeListCard title="Quests" accentClass="text-purple-300" items={portfolio.quests.map((quest) => ({ id: quest.id, title: quest.title, subtitle: quest.description ?? "Quest" }))} emptyTitle="No trading quests yet" emptyDescription="Quests linked to Trading goals will appear automatically." />,
      },
      {
        id: "trading-activity",
        title: "Recent Activity",
        size: "lg",
        content: <AttributeActivityCard categoryId="trading" accentClass="text-emerald-300" events={activityEvents} />,
      },
    ],
    [activityEvents, categoryProgress?.level, categoryProgress?.name, categoryProgress?.xp, categoryProgress?.xpNeededForNextLevel, isReady, portfolio],
  );

  if (!isReady) {
    return <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-400">Loading trading progression...</div>;
  }

  return <CustomizablePage pageId="trading" title="Trading" subtitle="Arrange your Trading system panels directly." sections={sections} availableWidgets={availableWidgets} />;
}
