"use client";

import { useMemo } from "react";
import Card from "./Card";
import AttributeActivityCard from "./AttributeActivityCard";
import CustomizablePage from "./page-edit/CustomizablePage";
import { getCatalogWidgetsForPage } from "../_lib/widgets/catalog-registry";
import PageHeader from "./PageHeader";
import Progress from "./Progress";
import { getAttributePortfolio } from "../_lib/attribute-portfolio";
import { useAttributes } from "../_lib/hooks/useAttributes";
import { useGoalTree } from "../_lib/hooks/useGoalTree";
import { useCategoryProgression } from "../_lib/hooks/use-category-progression";
import { useProgression } from "../_lib/hooks/useProgression";
import type { EditablePageSection } from "./page-edit/types";

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

function toAccentTextClass(accentBgClass: string) {
  return accentBgClass.startsWith("bg-") ? "text-" + accentBgClass.slice(3) : "text-purple-300";
}

export default function AttributePage({ attributeId }: Readonly<{ attributeId: string }>) {
  const { attributes, hasLoaded: hasLoadedAttributes } = useAttributes();
  const { isReady, progression } = useCategoryProgression(attributeId);
  const { goalTree } = useGoalTree();
  const { questDefinitions, activityEvents } = useProgression();

  const attribute = attributes.find((item) => item.id === attributeId);
  const displayName = attribute?.name ?? progression?.name ?? attributeId;
  const accentClass = attribute ? toAccentTextClass(attribute.accent) : "text-purple-300";

  const portfolio = useMemo(() => getAttributePortfolio(goalTree, questDefinitions, attributeId), [goalTree, questDefinitions, attributeId]);
  const availableWidgets = useMemo(() => getCatalogWidgetsForPage(attributeId), [attributeId]);
  const categoryProgress = progression ?? null;

  const sections = useMemo<EditablePageSection[]>(
    () => [
      {
        id: `${attributeId}-header`,
        title: "Header",
        size: "xl",
        content: (
          <PageHeader
            title={displayName}
            level={isReady ? categoryProgress?.level ?? 1 : 1}
            xp={isReady ? categoryProgress?.xp ?? 0 : 0}
            maxXp={isReady ? categoryProgress?.xpNeededForNextLevel ?? 1 : 1}
            accentClass={accentClass}
          />
        ),
      },
      {
        id: `${attributeId}-dreams`,
        title: "Dreams",
        size: "lg",
        content: (
          <AttributeListCard
            title="Dreams"
            accentClass={accentClass}
            items={portfolio.dreams.map((dream) => ({ id: dream.id, title: dream.title, subtitle: dream.description ?? dream.type.replaceAll("_", " "), progress: dream.progress }))}
            emptyTitle={`No ${displayName.toLowerCase()} dreams yet`}
            emptyDescription={`Create a Dream with ${displayName} attached to see it appear here.`}
          />
        ),
      },
      {
        id: `${attributeId}-goals`,
        title: "Goals",
        size: "lg",
        content: (
          <AttributeListCard
            title="Goals"
            accentClass="text-cyan-300"
            items={portfolio.goals.map((goal) => ({ id: goal.id, title: goal.title, subtitle: goal.description ?? goal.type.replaceAll("_", " "), progress: goal.progress }))}
            emptyTitle={`No ${displayName.toLowerCase()} goals yet`}
            emptyDescription={`${displayName} goals inherited from a Dream will appear automatically.`}
          />
        ),
      },
      {
        id: `${attributeId}-milestones`,
        title: "Milestones",
        size: "lg",
        content: (
          <AttributeListCard
            title="Milestones"
            accentClass="text-amber-300"
            items={portfolio.milestones.map((milestone) => ({ id: milestone.id, title: milestone.title, subtitle: milestone.description ?? milestone.type.replaceAll("_", " "), progress: milestone.progress }))}
            emptyTitle={`No ${displayName.toLowerCase()} milestones yet`}
            emptyDescription={`Milestones tied to the ${displayName} branch will show up here.`}
          />
        ),
      },
      {
        id: `${attributeId}-progress-goals`,
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
            emptyTitle={`No ${displayName.toLowerCase()} progress goals yet`}
            emptyDescription={`Progress goals under the ${displayName} dream will appear here.`}
          />
        ),
      },
      {
        id: `${attributeId}-quests`,
        title: "Quests",
        size: "lg",
        content: (
          <AttributeListCard
            title="Quests"
            accentClass="text-purple-300"
            items={portfolio.quests.map((quest) => ({ id: quest.id, title: quest.title, subtitle: quest.description ?? "Quest" }))}
            emptyTitle={`No ${displayName.toLowerCase()} quests yet`}
            emptyDescription={`Quests linked to ${displayName} goals will appear automatically.`}
          />
        ),
      },
      {
        id: `${attributeId}-activity`,
        title: "Recent Activity",
        size: "lg",
        content: <AttributeActivityCard categoryId={attributeId} accentClass={accentClass} events={activityEvents} />,
      },
    ],
    [accentClass, activityEvents, attributeId, categoryProgress?.level, categoryProgress?.xp, categoryProgress?.xpNeededForNextLevel, displayName, isReady, portfolio],
  );

  if (!isReady || !hasLoadedAttributes) {
    return <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-400">Loading attribute progression...</div>;
  }

  if (!attribute) {
    return (
      <Card className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Attribute Not Found</p>
        <h1 className="mt-3 text-2xl font-black text-white">&quot;{attributeId}&quot; isn&apos;t one of your attributes</h1>
        <p className="mt-3 text-sm text-slate-400">This attribute may have been renamed or removed. Manage your attributes from Settings or the onboarding flow.</p>
      </Card>
    );
  }

  return (
    <CustomizablePage
      pageId={attributeId}
      title={displayName}
      subtitle={`Arrange your ${displayName} system panels directly.`}
      sections={sections}
      availableWidgets={availableWidgets}
    />
  );
}
