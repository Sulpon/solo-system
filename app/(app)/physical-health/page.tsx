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
                {typeof item.progress === "number" ? <span className="shrink-0 text-sm font-semibold text-rose-200">{item.progress}%</span> : null}
              </div>
              {typeof item.progress === "number" ? (
                <Progress value={item.progress} max={100} className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950/80" fillClassName="h-full bg-gradient-to-r from-rose-400 to-cyan-300" />
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
  const { isReady, progression } = useCategoryProgression("physical-health");
  const { goalTree } = useGoalTree();
  const { questDefinitions, activityEvents } = useProgression();

  const portfolio = useMemo(() => getAttributePortfolio(goalTree, questDefinitions, "physical-health"), [goalTree, questDefinitions]);
  const availableWidgets = useMemo(() => getPageWidgetSections("physical-health"), []);

  const sections = useMemo<EditablePageSection[]>(
    () => [
      {
        id: "physical-health-header",
        title: "Header",
        size: "xl",
        content: (
          <PageHeader
            title={progression?.name ?? "Physical Health"}
            level={isReady ? progression?.level ?? 1 : 1}
            xp={isReady ? progression?.xp ?? 0 : 0}
            maxXp={isReady ? progression?.xpNeededForNextLevel ?? 1 : 1}
            accentClass="text-rose-300"
          />
        ),
      },
      { id: "physical-health-stats", title: "Stats", size: "lg", content: <AttributeListCard title="Stats" accentClass="text-rose-300" items={portfolio.progressGoals.map((goal) => ({ id: goal.id, title: goal.title, subtitle: goal.unit ? `${goal.currentValue ?? 0} / ${goal.targetValue ?? 0} ${goal.unit}` : goal.description ?? "Progress goal", progress: goal.progress }))} emptyTitle="No health stats yet" emptyDescription="Health progress goals will show here automatically." /> },
      { id: "physical-health-workouts", title: "Workouts", size: "lg", content: <AttributeListCard title="Workouts This Week" accentClass="text-cyan-300" items={portfolio.quests.map((quest) => ({ id: quest.id, title: quest.title, subtitle: quest.description ?? "Quest" }))} emptyTitle="No workouts yet" emptyDescription="Health-linked quests and habits will show here." /> },
      { id: "physical-health-nutrition", title: "Nutrition", size: "lg", content: <AttributeListCard title="Nutrition" accentClass="text-purple-300" items={portfolio.goals.map((goal) => ({ id: goal.id, title: goal.title, subtitle: goal.description ?? "Goal", progress: goal.progress }))} emptyTitle="No nutrition goals yet" emptyDescription="Nutrition goals tied to this attribute appear automatically." /> },
      { id: "physical-health-trackers", title: "Health Trackers", size: "lg", content: <AttributeListCard title="Health Trackers" accentClass="text-emerald-300" items={portfolio.milestones.map((milestone) => ({ id: milestone.id, title: milestone.title, subtitle: milestone.description ?? "Milestone", progress: milestone.progress }))} emptyTitle="No health trackers yet" emptyDescription="Milestones and progress goals linked to health will appear here." /> },
      { id: "physical-health-photos", title: "Progress Photos", size: "lg", content: <AttributeListCard title="Progress Photos" accentClass="text-orange-300" items={portfolio.dreams.map((dream) => ({ id: dream.id, title: dream.title, subtitle: dream.description ?? "Dream", progress: dream.progress }))} emptyTitle="No progress photos yet" emptyDescription="Dreams and long-term health goals will appear here." /> },
      { id: "physical-health-activity", title: "Recent Activity", size: "lg", content: <AttributeActivityCard categoryId="physical-health" accentClass="text-rose-300" events={activityEvents} /> },
    ],
    [activityEvents, isReady, portfolio.dreams, portfolio.goals, portfolio.milestones, portfolio.progressGoals, portfolio.quests, progression?.level, progression?.name, progression?.xp, progression?.xpNeededForNextLevel],
  );

  if (!isReady) {
    return <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-400">Loading physical health progression...</div>;
  }

  return <CustomizablePage pageId="physical-health" title="Physical Health" subtitle="Arrange your Physical Health system panels directly." sections={sections} availableWidgets={availableWidgets} />;
}
