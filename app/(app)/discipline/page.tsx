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
                {typeof item.progress === "number" ? <span className="shrink-0 text-sm font-semibold text-purple-200">{item.progress}%</span> : null}
              </div>
              {typeof item.progress === "number" ? (
                <Progress value={item.progress} max={100} className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950/80" fillClassName="h-full bg-gradient-to-r from-purple-500 to-cyan-400" />
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
  const { isReady, progression } = useCategoryProgression("discipline");
  const { goalTree } = useGoalTree();
  const { questDefinitions, progressionSummary, activityEvents } = useProgression();

  const portfolio = useMemo(() => getAttributePortfolio(goalTree, questDefinitions, "discipline"), [goalTree, questDefinitions]);
  const availableWidgets = useMemo(() => getPageWidgetSections("discipline"), []);

  const sections = useMemo<EditablePageSection[]>(
    () => [
      {
        id: "discipline-header",
        title: "Header",
        size: "xl",
        content: (
          <div className="space-y-3">
            <PageHeader
              title={progression?.name ?? "Discipline"}
              level={isReady ? progression?.level ?? 1 : 1}
              xp={isReady ? progression?.xp ?? 0 : 0}
              maxXp={isReady ? progression?.xpNeededForNextLevel ?? 1 : 1}
              accentClass="text-purple-300"
            />
            <p className="text-sm text-slate-400">Current streak: {progressionSummary.currentStreak} days</p>
          </div>
        ),
      },
      {
        id: "discipline-habits",
        title: "Habits",
        size: "lg",
        content: <AttributeListCard title="Habits" accentClass="text-purple-300" items={portfolio.quests.map((quest) => ({ id: quest.id, title: quest.title, subtitle: quest.description ?? "Quest" }))} emptyTitle="No habits yet" emptyDescription="Add discipline-linked quests and habits to see them here." />,
      },
      {
        id: "discipline-weekly-progress",
        title: "Weekly Progress",
        size: "lg",
        content: (
          <Card className="rounded-2xl border border-purple-500/30 bg-slate-900 p-5">
            <h2 className="text-xl font-bold text-purple-300">Weekly Progress</h2>
            <div className="mt-5 grid h-64 place-items-center rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
              No XP yet. Complete discipline quests to build a real weekly chart.
            </div>
          </Card>
        ),
      },
      {
        id: "discipline-focus-time",
        title: "Focus Time",
        size: "md",
        content: (
          <Card className="rounded-2xl border border-cyan-400/20 bg-slate-900 p-5">
            <p className="text-sm font-semibold tracking-wide text-cyan-300">FOCUS TIME</p>
            <p className="mt-4 text-5xl font-bold">{progressionSummary.dailyXP.toLocaleString()} XP</p>
            <p className="mt-3 text-sm text-slate-400">this week</p>
            <p className="mt-6 rounded-xl border border-cyan-400/20 bg-slate-950/60 p-3 text-cyan-300">No focus sessions tracked yet</p>
          </Card>
        ),
      },
      {
        id: "discipline-skills",
        title: "Discipline Skills",
        size: "lg",
        content: <AttributeListCard title="Discipline Skills" accentClass="text-purple-300" items={portfolio.goals.map((goal) => ({ id: goal.id, title: goal.title, subtitle: goal.description ?? "Goal", progress: goal.progress }))} emptyTitle="No discipline skills yet" emptyDescription="Skills tied to the Discipline branch will appear here." />,
      },
      {
        id: "discipline-activity",
        title: "Recent Activity",
        size: "lg",
        content: <AttributeActivityCard categoryId="discipline" accentClass="text-purple-300" events={activityEvents} />,
      },
    ],
    [activityEvents, isReady, portfolio.goals, portfolio.quests, progression?.level, progression?.name, progression?.xp, progression?.xpNeededForNextLevel, progressionSummary.currentStreak, progressionSummary.dailyXP],
  );

  if (!isReady) {
    return <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-400">Loading discipline progression...</div>;
  }

  return <CustomizablePage pageId="discipline" title="Discipline" subtitle="Arrange your Discipline system panels directly." sections={sections} availableWidgets={availableWidgets} />;
}
