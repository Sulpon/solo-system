"use client";

import { useMemo } from "react";
import Card from "../Card";
import SectionTitle from "../SectionTitle";
import { useProgression } from "../../_lib/hooks/useProgression";
import { getLocalDayKey } from "../../_lib/local-day";
import type { ChartWidgetConfig } from "../../_lib/types/dashboard-widget";
import type { Quest, QuestCompletion } from "../../_lib/types/quest";
import type { XpEvent } from "../../_lib/types/progression";

type ChartEntry = Readonly<{
  completedAt: string;
  amount: number;
  questId: string | null;
  quest: Quest | null;
  attributeRewardsAwarded: ReadonlyArray<Readonly<{ attributeId: string }>>;
}>;

function formatLabel(config: ChartWidgetConfig) {
  const metricLabels: Record<ChartWidgetConfig["metric"], string> = {
    xp: "XP",
    "completed-quests": "Completed Quests",
    trading: "Trading",
    health: "Health",
  };

  return metricLabels[config.metric] + " / " + config.timeRange.toUpperCase();
}

function getRangeDays(timeRange: ChartWidgetConfig["timeRange"], earliestDate: Date | null) {
  if (timeRange === "7d") {
    return 7;
  }

  if (timeRange === "30d") {
    return 30;
  }

  if (timeRange === "90d") {
    return 90;
  }

  if (!earliestDate) {
    return 30;
  }

  const today = new Date();
  const start = new Date(earliestDate);
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
  return Math.max(1, Math.min(90, diffDays));
}

function matchesMetricCategory(
  metric: ChartWidgetConfig["metric"],
  quest: Quest | null,
  completion: Pick<ChartEntry, "attributeRewardsAwarded">,
  categoryId?: string,
) {
  const rewardMatches = completion.attributeRewardsAwarded ?? [];

  if (categoryId) {
    if (rewardMatches.some((reward) => reward.attributeId === categoryId)) {
      return true;
    }

    return quest?.categoryId === categoryId;
  }

  if (metric === "trading") {
    return rewardMatches.some((reward) => reward.attributeId === "trading") || quest?.categoryId === "trading";
  }

  if (metric === "health") {
    return rewardMatches.some((reward) => reward.attributeId === "physical-health") || quest?.categoryId === "physical-health";
  }

  return true;
}

function createSeries(completions: ReadonlyArray<QuestCompletion>, goalXpEvents: ReadonlyArray<XpEvent>, quests: ReadonlyArray<Quest>, config: ChartWidgetConfig) {
  const questMap = new Map(quests.map((quest) => [quest.id, quest]));
  const matchingCompletions = [
    ...completions
      .map((completion) => ({
        completedAt: completion.completedAt,
        amount: completion.xpAwarded,
        questId: completion.questId,
        quest: questMap.get(completion.questId) ?? null,
        attributeRewardsAwarded: completion.attributeRewardsAwarded,
      }))
      .filter((completion) => matchesMetricCategory(config.metric, completion.quest, completion, config.categoryId)),
    ...goalXpEvents
      .map((event) => ({
        completedAt: event.createdAt,
        amount: event.amount,
        questId: null,
        quest: null,
        attributeRewardsAwarded: event.attributeXp,
      }))
      .filter((event) => matchesMetricCategory(config.metric, event.quest, event, config.categoryId)),
  ];

  const earliestDate = matchingCompletions.length > 0 ? new Date(matchingCompletions[0].completedAt) : null;
  for (const completion of matchingCompletions) {
    const completedAt = new Date(completion.completedAt);
    if (!earliestDate || completedAt < earliestDate) {
      if (earliestDate) {
        earliestDate.setTime(completedAt.getTime());
      }
    }
  }

  const rangeDays = getRangeDays(config.timeRange, earliestDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (rangeDays - 1));

  const buckets = Array.from({ length: rangeDays }, (_, index) => {
    const bucketDate = new Date(startDate);
    bucketDate.setDate(startDate.getDate() + index);
    const key = getLocalDayKey(bucketDate);
    return { key, value: 0 };
  });

  const bucketIndexByKey = new Map(buckets.map((bucket, index) => [bucket.key, index]));

  for (const completion of matchingCompletions) {
    const bucketKey = getLocalDayKey(completion.completedAt);
    const bucketIndex = bucketIndexByKey.get(bucketKey);

    if (bucketIndex === undefined) {
      continue;
    }

    if (config.metric === "completed-quests") {
      if (!("questId" in completion) || completion.questId === null) {
        continue;
      }
      buckets[bucketIndex].value += 1;
      continue;
    }

    buckets[bucketIndex].value += completion.amount;
  }

  return buckets.map((bucket) => bucket.value);
}

function renderLine(points: ReadonlyArray<number>, type: "line" | "area") {
  const maxValue = Math.max(...points, 1);
  const normalizedPoints = points.map((value, index) => {
    const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
    const y = 100 - (value / maxValue) * 100;
    return `${x},${y}`;
  });
  const areaPoints = `0,100 ${normalizedPoints.join(" ")} 100,100`;

  return (
    <svg viewBox="0 0 100 100" className="h-44 w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
      {type === "area" ? <polygon points={areaPoints} className="fill-purple-500/20" /> : null}
      <polyline points={normalizedPoints.join(" ")} className="fill-none stroke-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.55)]" strokeWidth="3" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

type ChartWidgetProps = Readonly<{
  title: string;
  config: ChartWidgetConfig;
  // When provided, renders this fixed series instead of deriving one from
  // live progression data - used for Widget Catalog previews so they never
  // show the current user's real numbers.
  previewSeries?: ReadonlyArray<number>;
}>;

export default function ChartWidget({ title, config, previewSeries }: ChartWidgetProps) {
  const { questDefinitions, questCompletions, goalXpEvents } = useProgression();

  const liveSeries = useMemo(
    () => createSeries(questCompletions, goalXpEvents, questDefinitions, config),
    [config, goalXpEvents, questCompletions, questDefinitions],
  );

  const series = previewSeries ?? liveSeries;

  const maxValue = Math.max(...series, 1);

  return (
    <Card className="border-purple-500/20 bg-slate-950/45 p-5">
      <SectionTitle eyebrow={formatLabel(config)} title={title} />
      <div className="mt-5 rounded-xl border border-purple-500/15 bg-slate-950/70 p-4 shadow-inner shadow-black/40">
        {series.length > 0 && maxValue > 0 ? (
          config.chartType === "bar" ? (
            <div className="flex min-h-44 items-end gap-3">
              {series.map((value, index) => (
                <div key={index} className="flex h-44 flex-1 items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-purple-700 to-cyan-300 shadow-[0_0_18px_rgba(168,85,247,0.22)]"
                    style={{ height: `${Math.max(6, (value / maxValue) * 100)}%` }}
                  />
                </div>
              ))}
            </div>
          ) : (
            renderLine(series, config.chartType)
          )
        ) : (
          <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-500">
            No completion data yet
          </div>
        )}
      </div>
    </Card>
  );
}
