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
                {typeof item.progress === "number" ? <span className="shrink-0 text-sm font-semibold text-emerald-200">{item.progress}%</span> : null}
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
  const { isReady, progression } = useCategoryProgression("self-development");
  const { goalTree } = useGoalTree();
  const { questDefinitions, activityEvents } = useProgression();

  const portfolio = useMemo(() => getAttributePortfolio(goalTree, questDefinitions, "self-development"), [goalTree, questDefinitions]);
  const availableWidgets = useMemo(() => getPageWidgetSections("self-development"), []);

  const sections = useMemo<EditablePageSection[]>(
    () => [
      {
        id: "self-development-header",
        title: "Header",
        size: "xl",
        content: (
          <PageHeader
            title={progression?.name ?? "Self-Development"}
            level={isReady ? progression?.level ?? 1 : 1}
            xp={isReady ? progression?.xp ?? 0 : 0}
            maxXp={isReady ? progression?.xpNeededForNextLevel ?? 1 : 1}
            accentClass="text-emerald-300"
          />
        ),
      },
      { id: "self-development-skills", title: "Skills", size: "lg", content: <AttributeListCard title="Skills" accentClass="text-emerald-300" items={portfolio.goals.map((goal) => ({ id: goal.id, title: goal.title, subtitle: goal.description ?? "Goal", progress: goal.progress }))} emptyTitle="No skills yet" emptyDescription="Goals under Self-Development appear here automatically." /> },
      { id: "self-development-goals", title: "Current Goals", size: "lg", content: <AttributeListCard title="Current Goals" accentClass="text-cyan-300" items={portfolio.dreams.map((dream) => ({ id: dream.id, title: dream.title, subtitle: dream.description ?? "Dream", progress: dream.progress }))} emptyTitle="No goals yet" emptyDescription="Create a dream with Self-Development attributes to see it here." /> },
      { id: "self-development-reading", title: "Reading Tracker", size: "lg", content: <AttributeListCard title="Reading Tracker" accentClass="text-purple-300" items={portfolio.milestones.map((milestone) => ({ id: milestone.id, title: milestone.title, subtitle: milestone.description ?? "Milestone", progress: milestone.progress }))} emptyTitle="No reading tracker yet" emptyDescription="Milestones under this attribute will show automatically." /> },
      { id: "self-development-italian", title: "Italian Progress", size: "lg", content: <AttributeListCard title="Italian Progress" accentClass="text-orange-300" items={portfolio.progressGoals.map((goal) => ({ id: goal.id, title: goal.title, subtitle: goal.unit ? `${goal.currentValue ?? 0} / ${goal.targetValue ?? 0} ${goal.unit}` : goal.description ?? "Progress goal", progress: goal.progress }))} emptyTitle="No Italian progress yet" emptyDescription="Progress goals under this attribute will appear here." /> },
      { id: "self-development-learning", title: "Recent Learning", size: "lg", content: <AttributeListCard title="Recent Learning" accentClass="text-cyan-300" items={portfolio.quests.map((quest) => ({ id: quest.id, title: quest.title, subtitle: quest.description ?? "Quest" }))} emptyTitle="No recent learning activity yet" emptyDescription="Self-development quests will appear here automatically." /> },
      { id: "self-development-activity", title: "Recent Activity", size: "lg", content: <AttributeActivityCard categoryId="self-development" accentClass="text-emerald-300" events={activityEvents} /> },
    ],
    [activityEvents, isReady, portfolio.dreams, portfolio.goals, portfolio.milestones, portfolio.progressGoals, portfolio.quests, progression?.level, progression?.name, progression?.xp, progression?.xpNeededForNextLevel],
  );

  if (!isReady) {
    return <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-400">Loading self-development progression...</div>;
  }

  return <CustomizablePage pageId="self-development" title="Self-Development" subtitle="Arrange your Self-Development system panels directly." sections={sections} availableWidgets={availableWidgets} />;
}
