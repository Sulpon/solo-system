"use client";

import { useMemo } from "react";
import AchievementCard from "../../_components/AchievementCard";
import Card from "../../_components/Card";
import CategoryCard from "../../_components/CategoryCard";
import CharacterCard from "../../_components/CharacterCard";
import ChartWidget from "../../_components/dashboard/ChartWidget";
import AttributeOverviewCard from "../../_components/dashboard/AttributeOverviewCard";
import BonusMissionsCard from "../../_components/dashboard/BonusMissionsCard";
import CommandCenterHeader from "../../_components/dashboard/CommandCenterHeader";
import ConsistencyScoreCard from "../../_components/dashboard/ConsistencyScoreCard";
import DreamProgressCard from "../../_components/dashboard/DreamProgressCard";
import MinimumSuccessfulDayCard from "../../_components/dashboard/MinimumSuccessfulDayCard";
import NightReviewModal from "../../_components/dashboard/NightReviewModal";
import RecentMilestonesCard from "../../_components/dashboard/RecentMilestonesCard";
import TodayProgressFeed from "../../_components/dashboard/TodayProgressFeed";
import TomorrowPreviewCard from "../../_components/dashboard/TomorrowPreviewCard";
import XPOverviewCard from "../../_components/dashboard/XPOverviewCard";
import { getLiveDreamProgress, getRecentGoalMilestones, getWeeklyXpSeries } from "../../_components/dashboard/dashboard-overview.utils";
import DailyQuestsCard from "../../_components/DailyQuestsCard";
import Progress from "../../_components/Progress";
import SectionTitle from "../../_components/SectionTitle";
import QuestCompletionModal from "../../_components/quests/QuestCompletionModal";
import { useQuestCompletionFlow } from "../../_components/quests/useQuestCompletionFlow";
import { achievements } from "../mock/achievements";
import { characterProfile } from "../mock/character";
import { mainQuest } from "../mock/main-quest";
import { useGoalTree } from "../hooks/useGoalTree";
import { useNightReviewFlow } from "../hooks/useNightReviewFlow";
import { useProgression } from "../hooks/useProgression";
import { calculateDailySuccess, getAttributeXpForDay, getBonusQuests, getCompletedQuestIdsForDay, getConsistencyScore, getCoreQuests, getTodayQuests } from "../daily-system";
import { getTodayEvents } from "../activity-events";
import { getLocalDayKey } from "../local-day";
import type { CategoryProgression } from "../engines/progression-engine";
import type {
  DashboardGridLayout,
  DashboardLayout,
  DashboardRow,
  DashboardWidget,
  ChartWidgetConfig,
  DashboardWidgetType,
  WidgetAccent,
  WidgetCategory,
  WidgetDefinition,
  WidgetRendererProps,
  WidgetSettings,
} from "../types/dashboard-widget";
import type { DailyQuest, Quest } from "../types/quest";

export const WIDGET_LAYOUT_VERSION = 2;

export const widgetCategories: WidgetCategory[] = [
  "Character",
  "Quests",
  "Trading",
  "Productivity",
  "Health",
  "Learning",
  "Statistics",
  "Command Center",
];

const defaultDashboardWidgetIds: DashboardWidgetType[] = [
  "command-center-header",
  "minimum-successful-day",
  "bonus-missions",
  "night-review",
  "dream-progress",
  "attribute-overview",
  "consistency-score",
  "today-progress-feed",
  "tomorrow-preview",
  "recent-milestones",
  "xp-overview",
];

function getRankLabel(level: number) {
  if (level >= 30) {
    return "S";
  }

  if (level >= 24) {
    return "A";
  }

  if (level >= 18) {
    return "B";
  }

  if (level >= 12) {
    return "C";
  }

  return "D";
}

function toDailyQuest(quest: Quest): DailyQuest {
  return {
    id: quest.id,
    title: quest.title,
    description: quest.description ?? "",
    category: quest.categoryId,
    xp: quest.xp,
    importance: quest.importance ?? "core",
    scheduledDays: quest.scheduledDays ?? [],
    completed: false,
    linkedProgressGoalId: quest.linkedProgressGoalId ?? null,
    attributeXPOverride: quest.attributeXPOverride ?? [],
  };
}

function cloneWidgetSettings(settings: WidgetSettings): WidgetSettings {
  return { ...settings };
}

export function createDefaultWidgetSettings(overrides?: Partial<WidgetSettings>): WidgetSettings {
  return {
    showTitle: true,
    compactMode: false,
    accentColor: "purple",
    showBorder: true,
    transparency: 12,
    padding: "normal",
    refreshInterval: null,
    ...overrides,
  };
}

function makeWidgetId(type: DashboardWidgetType, suffix?: string) {
  if (suffix) {
    return suffix;
  }

  return type;
}

export function createWidgetInstance(
  definition: WidgetDefinition,
  overrides: Readonly<
    Partial<
      Pick<DashboardWidget, "id" | "title" | "visible" | "order" | "size" | "settings" | "config">
    >
  > = {},
): DashboardWidget {
  return {
    id: overrides.id ?? makeWidgetId(definition.id),
    type: definition.id,
    title: overrides.title ?? definition.title,
    visible: overrides.visible ?? true,
    order: overrides.order ?? 0,
    size: overrides.size ?? definition.defaultSize,
    settings: cloneWidgetSettings(overrides.settings ?? definition.defaultSettings),
    config: overrides.config ?? definition.defaultConfig,
  };
}

function createDefaultWidgetRow(widgetId: string): DashboardRow {
  return { id: `row-${widgetId}`, widgetIds: [widgetId] };
}

function createDefaultWidgetOrder(): DashboardWidget[] {
  return defaultDashboardWidgetIds
    .map((widgetId) => widgetRegistry.find((definition) => definition.id === widgetId))
    .filter((definition): definition is WidgetDefinition => Boolean(definition))
    .map((definition, index) =>
      createWidgetInstance(definition, {
        id: definition.id,
        order: (index + 1) * 10,
      }),
    );
}

export function createDefaultDashboardLayout(): DashboardLayout {
  return {
    id: "default-dashboard-layout",
    userId: "mock-user",
    layoutVersion: WIDGET_LAYOUT_VERSION,
    updatedAt: "2026-06-29T00:00:00.000Z",
    widgets: createDefaultWidgetOrder(),
  };
}

export function createDefaultDashboardGridLayout(): DashboardGridLayout {
  const widgets = createDefaultWidgetOrder();
  const byRow = new Map<string, string[]>();

  for (const widget of widgets) {
    const definition = getWidgetDefinition(widget.type);
    const rowId = definition?.defaultRow ?? `row-${widget.id}`;
    const current = byRow.get(rowId) ?? [];
    current.push(widget.id);
    byRow.set(rowId, current);
  }

  return {
    id: "default-dashboard-grid-layout",
    layoutVersion: WIDGET_LAYOUT_VERSION,
    updatedAt: "2026-06-29T00:00:00.000Z",
    rows: Array.from(byRow.entries()).map(([rowId, widgetIds]) => ({ id: rowId, widgetIds })),
  };
}

function renderCharacterWidget() {
  const { progressionSummary } = useProgression();

  return (
      <CharacterCard
      character={{
        name: characterProfile.name,
        title: characterProfile.title,
        overallXP: progressionSummary.totalXP,
        currentLevel: progressionSummary.currentLevel,
        rank: getRankLabel(progressionSummary.currentLevel),
        currentStreak: progressionSummary.currentStreak,
        powerScore: progressionSummary.powerScore,
      }}
    />
  );
}

function renderDailyQuestsWidget() {
  const { questDefinitions } = useProgression();
  const quests = useMemo(
    () =>
      getTodayQuests(questDefinitions).map(toDailyQuest),
    [questDefinitions],
  );

  return <DailyQuestsCard quests={quests} />;
}

function renderMainQuestWidget() {
  if (mainQuest.objectives.length === 0) {
    return (
      <Card className="overflow-hidden border-cyan-400/20 bg-[radial-gradient(circle_at_88%_18%,rgba(34,211,238,0.16),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.72),rgba(2,6,23,0.9))] p-6">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Main Quest</p>
          <h2 className="mt-3 text-2xl font-bold text-white">{mainQuest.title}</h2>
          <p className="mt-2 text-sm text-slate-400">{mainQuest.description}</p>
          <p className="mt-4 text-sm text-slate-500">No objectives yet</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-cyan-400/20 bg-[radial-gradient(circle_at_88%_18%,rgba(34,211,238,0.16),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.72),rgba(2,6,23,0.9))] p-6">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Main Quest</p>
          <h2 className="mt-3 text-2xl font-bold text-white">{mainQuest.title}</h2>
          <p className="mt-2 text-sm text-slate-400">{mainQuest.description}</p>
        </div>
        <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.16)]">
          {mainQuest.progress}%
        </div>
      </div>

      <Progress
        value={mainQuest.progress}
        className="mt-6 h-3 overflow-hidden rounded-full bg-slate-950/80"
        fillClassName="h-full bg-gradient-to-r from-cyan-400 to-purple-400"
      />

      <div className="mt-6 space-y-3">
        {mainQuest.objectives.map((objective) => (
          <div key={objective.id} className="flex items-center gap-3 rounded-lg border border-slate-800/80 bg-slate-950/35 px-3 py-2 text-sm text-slate-300">
            <span className={objective.completed ? "text-emerald-400" : "text-slate-500"}>{objective.completed ? "[x]" : "[ ]"}</span>
            <span>{objective.title}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function renderCategoryLevelsWidget() {
  const { progressionSummary } = useProgression();

  return (
    <Card className="bg-slate-950/45 p-5">
      <SectionTitle title="Attributes / Category Levels" />
      <div className="mt-5 grid min-w-0 gap-4 [grid-template-columns:repeat(auto-fit,minmax(120px,1fr))]">
        {progressionSummary.categoryProgression.map((category: CategoryProgression) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </Card>
  );
}

function renderStatisticsWidget() {
  const { progressionSummary } = useProgression();
  const statistics = [
    { label: "Total XP", value: progressionSummary.totalXP.toLocaleString() },
    { label: "Completed Quests", value: progressionSummary.completedQuests.toLocaleString() },
    { label: "Today XP", value: progressionSummary.dailyXP.toLocaleString() },
    { label: "This Week", value: progressionSummary.weeklyXP.toLocaleString() },
    { label: "Trades Logged", value: "—" },
    { label: "Workout Sessions", value: "—" },
  ];

  return (
    <Card className="border-cyan-400/20 bg-slate-950/45 p-5">
      <SectionTitle title="Statistics" accentClass="text-cyan-300" />
      <div className="mt-5 space-y-3">
        {statistics.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/35 px-3 py-3 text-sm">
            <span className="min-w-0 text-slate-400">{stat.label}</span>
            <span className={stat.value === "—" ? "font-semibold text-slate-500" : "font-semibold text-white"}>{stat.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function createPlaceholderRenderer(title: string, description: string, accentClass = "text-purple-300") {
  return function PlaceholderWidgetRenderer({ widget }: WidgetRendererProps) {
    return (
      <Card className="bg-slate-950/45 p-5">
        <SectionTitle title={widget.title ?? title} accentClass={accentClass} />
        <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4">
          <p className="text-sm text-slate-300">{description}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">Customizable widget placeholder</p>
        </div>
      </Card>
    );
  };
}

function renderAchievementWidget() {
  const achievement = achievements[0];

  if (!achievement) {
    return (
      <Card className="border-purple-500/20 bg-slate-950/45 p-5">
        <SectionTitle title="Recent Achievement" />
        <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-400">
          No achievements unlocked yet
        </div>
      </Card>
    );
  }

  return <AchievementCard achievement={achievement} />;
}

function renderChartWidget({ widget }: WidgetRendererProps) {
  const config: ChartWidgetConfig =
    widget.config && "chartType" in widget.config && "metric" in widget.config && "timeRange" in widget.config
      ? (widget.config as ChartWidgetConfig)
      : { chartType: "bar", metric: "xp", timeRange: "7d", categoryId: "discipline" };

  return <ChartWidget title={widget.title} config={config} />;
}

function renderCharacterOverviewWidget() {
  return renderCharacterWidget();
}

function renderDailyQuestsOverviewWidget() {
  return renderDailyQuestsWidget();
}

function renderCalendarWidget() {
  return (
    <Card className="bg-slate-950/45 p-5">
      <SectionTitle title="Calendar" accentClass="text-emerald-300" />
      <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs text-slate-500">
        {["M", "T", "W", "T", "F", "S", "S"].map((day) => (
          <div key={day} className="rounded-lg border border-slate-800 bg-slate-950/50 py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-7 gap-2">
        {Array.from({ length: 28 }).map((_, index) => (
          <div key={index} className="aspect-square rounded-lg border border-slate-800/80 bg-slate-950/35" />
        ))}
      </div>
    </Card>
  );
}

function renderRecentActivityWidget() {
  const { activityEvents } = useProgression();
  const items = activityEvents.slice(0, 5);

  return (
    <Card className="bg-slate-950/45 p-5">
      <SectionTitle title="Recent Activity" accentClass="text-cyan-300" />
      <div className="mt-4 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
              <p className="truncate font-semibold text-white">{item.title}</p>
              <p className="mt-1 text-xs text-slate-500">{item.description ?? item.type.replaceAll("_", " ")}</p>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/45 px-4 py-3 text-sm text-slate-400">
            Complete quests to generate activity.
          </div>
        )}
      </div>
    </Card>
  );
}

function renderJournalWidget() {
  return (
    <Card className="bg-slate-950/45 p-5">
      <SectionTitle title="Journal" accentClass="text-amber-300" />
      <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
          "What moved the needle today?"
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
          "What did I avoid that I should not repeat?"
        </div>
      </div>
    </Card>
  );
}

function renderTradingWatchlistWidget() {
  const pairs = ["EUR/USD", "NQ", "BTC", "XAU/USD"];

  return (
    <Card className="bg-slate-950/45 p-5">
      <SectionTitle title="Trading Watchlist" accentClass="text-emerald-300" />
      <div className="mt-4 space-y-3">
        {pairs.map((pair) => (
          <div key={pair} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm">
            <span className="font-semibold text-white">{pair}</span>
            <span className="text-slate-500">Watching</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function renderTradingPerformanceWidget() {
  return (
    <Card className="bg-slate-950/45 p-5">
      <SectionTitle title="Trading Performance" accentClass="text-cyan-300" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[
          { label: "Win Rate", value: "64.2%" },
          { label: "EV", value: "0.78 R" },
          { label: "Profit Factor", value: "2.35" },
          { label: "Backtests", value: "232" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
            <p className="mt-1 text-lg font-bold text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function renderHabitTrackerWidget() {
  const habits = [
    { title: "Wake up before 6:00", done: true },
    { title: "Cold shower", done: true },
    { title: "Meditate", done: false },
    { title: "Plan the day", done: true },
  ];

  return (
    <Card className="bg-slate-950/45 p-5">
      <SectionTitle title="Habit Tracker" accentClass="text-rose-300" />
      <div className="mt-4 space-y-3">
        {habits.map((habit) => (
          <div key={habit.title} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm">
            <span className="min-w-0 pr-3 text-slate-300">{habit.title}</span>
            <span className={habit.done ? "text-emerald-300" : "text-slate-500"}>{habit.done ? "Done" : "Open"}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function renderFinanceOverviewWidget() {
  return (
    <Card className="bg-slate-950/45 p-5">
      <SectionTitle title="Finance Overview" accentClass="text-amber-300" />
      <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-300">
        Placeholder for budget, savings, and runway tracking.
      </div>
    </Card>
  );
}

function renderSocialFeedWidget() {
  return (
    <Card className="bg-slate-950/45 p-5">
      <SectionTitle title="Social Feed" accentClass="text-cyan-300" />
      <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-300">
        Placeholder for team updates, messages, or network signals.
      </div>
    </Card>
  );
}

function renderAiAssistantWidget() {
  return (
    <Card className="bg-slate-950/45 p-5">
      <SectionTitle title="AI Assistant" accentClass="text-purple-300" />
      <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-300">
        Placeholder for future AI-assisted planning and summarization.
      </div>
    </Card>
  );
}

function renderExperimentalLabWidget() {
  return (
    <Card className="bg-slate-950/45 p-5">
      <SectionTitle title="Experimental Lab" accentClass="text-rose-300" />
      <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-300">
        Space reserved for upcoming experiments and beta widgets.
      </div>
    </Card>
  );
}

function formatDashboardDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function useDailySuccessPercent() {
  const { questDefinitions, questCompletions } = useProgression();
  const todayQuests = useMemo(() => getTodayQuests(questDefinitions), [questDefinitions]);
  const coreQuests = useMemo(() => getCoreQuests(todayQuests), [todayQuests]);
  const completedQuestIds = useMemo(() => getCompletedQuestIdsForDay(questCompletions), [questCompletions]);
  const dailySuccessPercent = useMemo(() => calculateDailySuccess(coreQuests, completedQuestIds), [completedQuestIds, coreQuests]);
  return { coreQuests, completedQuestIds, dailySuccessPercent };
}

function renderCommandCenterHeaderWidget({ onEnterEditMode }: WidgetRendererProps) {
  const { coreQuests, dailySuccessPercent } = useDailySuccessPercent();
  const { reviewOpen, todaySnapshot, alreadyReviewedToday, openReview, closeReview, finishReview } = useNightReviewFlow();
  const bonusUnlocked = coreQuests.length > 0 && dailySuccessPercent === 100;
  const headerSubtitle = alreadyReviewedToday
    ? "Day locked in. See you tomorrow."
    : bonusUnlocked
      ? "Day won. Bonus missions are optional."
      : "Complete your Minimum Successful Day.";
  const currentDate = formatDashboardDate(new Date());

  return (
    <>
      <CommandCenterHeader
        currentDate={currentDate}
        dailySuccessPercent={dailySuccessPercent}
        subtitle={headerSubtitle}
        alreadyReviewed={alreadyReviewedToday}
        onFinishDay={openReview}
        onEnterEditMode={onEnterEditMode ?? (() => {})}
      />
      {reviewOpen ? (
        <NightReviewModal snapshot={todaySnapshot} alreadyReviewed={alreadyReviewedToday} onClose={closeReview} onFinish={finishReview} />
      ) : null}
    </>
  );
}

function renderMinimumSuccessfulDayWidget() {
  const { coreQuests, completedQuestIds, dailySuccessPercent } = useDailySuccessPercent();
  const { pendingQuest, pendingGoal, progressValue, setProgressValue, beginQuestCompletion, confirmQuestCompletion, cancelQuestCompletion, removeQuestCompletion } = useQuestCompletionFlow();

  function handleToggleQuest(quest: Quest, completed: boolean) {
    if (completed) {
      removeQuestCompletion(quest.id);
      return;
    }

    beginQuestCompletion(quest);
  }

  return (
    <>
      <MinimumSuccessfulDayCard quests={coreQuests} completedQuestIds={completedQuestIds} successPercent={dailySuccessPercent} onToggleQuest={handleToggleQuest} />
      {pendingQuest ? (
        <QuestCompletionModal
          questTitle={pendingQuest.title}
          goal={pendingGoal}
          progressValue={progressValue}
          onChange={setProgressValue}
          onCancel={cancelQuestCompletion}
          onConfirm={confirmQuestCompletion}
        />
      ) : null}
    </>
  );
}

function renderBonusMissionsWidget() {
  const { questDefinitions } = useProgression();
  const { coreQuests, completedQuestIds, dailySuccessPercent } = useDailySuccessPercent();
  const bonusQuests = useMemo(() => getBonusQuests(getTodayQuests(questDefinitions)), [questDefinitions]);
  const bonusUnlocked = coreQuests.length > 0 && dailySuccessPercent === 100;
  const { pendingQuest, pendingGoal, progressValue, setProgressValue, beginQuestCompletion, confirmQuestCompletion, cancelQuestCompletion, removeQuestCompletion } = useQuestCompletionFlow();

  function handleToggleQuest(quest: Quest, completed: boolean) {
    if (completed) {
      removeQuestCompletion(quest.id);
      return;
    }

    beginQuestCompletion(quest);
  }

  return (
    <>
      <BonusMissionsCard quests={bonusQuests} unlocked={bonusUnlocked} completedQuestIds={completedQuestIds} onToggleQuest={handleToggleQuest} />
      {pendingQuest ? (
        <QuestCompletionModal
          questTitle={pendingQuest.title}
          goal={pendingGoal}
          progressValue={progressValue}
          onChange={setProgressValue}
          onCancel={cancelQuestCompletion}
          onConfirm={confirmQuestCompletion}
        />
      ) : null}
    </>
  );
}

function renderNightReviewWidget() {
  const { reviewOpen, todaySnapshot, alreadyReviewedToday, openReview, closeReview, finishReview } = useNightReviewFlow();

  return (
    <>
      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Night Review</p>
        <h2 className="mt-1 text-xl font-black text-white">Close today cleanly</h2>
        <p className="mt-2 text-sm text-slate-400">Review today&apos;s core quests, optional missions, XP, and progress before you lock the day.</p>
        <button
          type="button"
          onClick={openReview}
          className="mt-5 rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
        >
          Finish Day
        </button>
      </Card>
      {reviewOpen ? (
        <NightReviewModal snapshot={todaySnapshot} alreadyReviewed={alreadyReviewedToday} onClose={closeReview} onFinish={finishReview} />
      ) : null}
    </>
  );
}

function renderDreamProgressWidget() {
  const { goalTree } = useGoalTree();
  const liveDreams = useMemo(() => getLiveDreamProgress(goalTree), [goalTree]);
  return <DreamProgressCard dreams={liveDreams} />;
}

function renderAttributeOverviewWidget() {
  const { progressionSummary, questCompletions, goalXpEvents } = useProgression();
  const todayAttributeXp = useMemo(() => getAttributeXpForDay(questCompletions, goalXpEvents), [goalXpEvents, questCompletions]);
  return <AttributeOverviewCard categories={progressionSummary.categoryProgression} todayAttributeXp={todayAttributeXp} />;
}

function renderConsistencyScoreWidget() {
  const { dailySnapshots } = useProgression();
  const { dailySuccessPercent } = useDailySuccessPercent();
  const consistencyScore = useMemo(() => getConsistencyScore(dailySnapshots), [dailySnapshots]);
  return <ConsistencyScoreCard score={consistencyScore} todayPercent={dailySuccessPercent} reviewedDays={dailySnapshots.length} />;
}

function renderTodayProgressFeedWidget() {
  const { activityEvents, dailySnapshots } = useProgression();
  const todayActivityEvents = useMemo(() => getTodayEvents(activityEvents), [activityEvents]);
  const alreadyReviewedToday = useMemo(() => dailySnapshots.some((snapshot) => snapshot.date === getLocalDayKey()), [dailySnapshots]);
  return <TodayProgressFeed events={todayActivityEvents} reviewedToday={alreadyReviewedToday} />;
}

function renderTomorrowPreviewWidget() {
  const { questDefinitions } = useProgression();
  const tomorrow = useMemo(() => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    return next;
  }, []);
  const tomorrowCoreQuests = useMemo(() => getCoreQuests(getTodayQuests(questDefinitions, tomorrow)), [questDefinitions, tomorrow]);
  const tomorrowCoreXp = tomorrowCoreQuests.reduce((total, quest) => total + quest.xp, 0);
  return <TomorrowPreviewCard coreQuestCount={tomorrowCoreQuests.length} estimatedXp={tomorrowCoreXp} />;
}

function renderRecentMilestonesWidget() {
  const { goalTree } = useGoalTree();
  const recentMilestones = useMemo(() => getRecentGoalMilestones(goalTree), [goalTree]);
  return <RecentMilestonesCard milestones={recentMilestones} />;
}

function renderXpOverviewWidget() {
  const { questCompletions, goalXpEvents } = useProgression();
  const weeklyXpSeries = useMemo(() => getWeeklyXpSeries(questCompletions, goalXpEvents), [goalXpEvents, questCompletions]);
  return <XPOverviewCard series={weeklyXpSeries} />;
}

export const widgetRegistry: WidgetDefinition[] = [
  {
    id: "character",
    title: "Character",
    description: "Live character status, level, streak, rank, and XP.",
    icon: "M",
    category: "Character",
    defaultSize: "lg",
    defaultRow: "row-status",
    canDuplicate: true,
    canDelete: false,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "purple", padding: "relaxed" }),
    component: renderCharacterOverviewWidget,
  },
  {
    id: "main-quest",
    title: "Main Quest",
    description: "The core objective that drives progression forward.",
    icon: "Q",
    category: "Quests",
    defaultSize: "md",
    defaultRow: "row-status",
    canDuplicate: true,
    canDelete: false,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "cyan" }),
    component: renderMainQuestWidget,
  },
  {
    id: "daily-quests",
    title: "Daily Quests",
    description: "The active daily checklist with XP and completion state.",
    icon: "D",
    category: "Quests",
    defaultSize: "lg",
    defaultRow: "row-quests",
    canDuplicate: true,
    canDelete: false,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "purple", padding: "compact" }),
    defaultConfig: { showCompletedCount: true },
    component: renderDailyQuestsWidget,
  },
  {
    id: "achievement",
    title: "Recent Achievement",
    description: "Recent milestone and its XP reward.",
    icon: "A",
    category: "Statistics",
    defaultSize: "md",
    defaultRow: "row-growth",
    canDuplicate: true,
    canDelete: false,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "amber" }),
    defaultConfig: { achievementId: "100-backtests" },
    component: renderAchievementWidget,
  },
  {
    id: "category-levels",
    title: "Attributes / Category Levels",
    description: "Category progression panels for the first five MENACE pillars.",
    icon: "C",
    category: "Statistics",
    defaultSize: "lg",
    defaultRow: "row-growth",
    canDuplicate: true,
    canDelete: false,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "cyan", padding: "compact" }),
    component: renderCategoryLevelsWidget,
  },
  {
    id: "statistics",
    title: "Statistics",
    description: "Current totals and summary metrics across MENACE.",
    icon: "S",
    category: "Statistics",
    defaultSize: "md",
    defaultRow: "row-insight",
    canDuplicate: true,
    canDelete: false,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "cyan" }),
    component: renderStatisticsWidget,
  },
  {
    id: "chart",
    title: "Progress Chart",
    description: "Flexible progress visualization driven by live quest data.",
    icon: "P",
    category: "Statistics",
    defaultSize: "xl",
    defaultRow: "row-insight",
    canDuplicate: true,
    canDelete: false,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "purple", padding: "compact" }),
    defaultConfig: { chartType: "bar", metric: "xp", timeRange: "7d", categoryId: "discipline" },
    component: renderChartWidget,
  },
  {
    id: "calendar",
    title: "Calendar",
    description: "A planning grid for schedules and time blocking.",
    icon: "L",
    category: "Productivity",
    defaultSize: "md",
    defaultRow: "row-productivity",
    canDuplicate: true,
    canDelete: true,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "emerald" }),
    component: renderCalendarWidget,
  },
  {
    id: "recent-activity",
    title: "Recent Activity",
    description: "A feed of the latest completed actions and events.",
    icon: "R",
    category: "Productivity",
    defaultSize: "md",
    defaultRow: "row-productivity",
    canDuplicate: true,
    canDelete: true,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "cyan" }),
    component: renderRecentActivityWidget,
  },
  {
    id: "journal",
    title: "Journal",
    description: "Private notes, reflections, and task captures.",
    icon: "J",
    category: "Learning",
    defaultSize: "md",
    defaultRow: "row-learning",
    canDuplicate: true,
    canDelete: true,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "amber" }),
    component: renderJournalWidget,
  },
  {
    id: "trading-watchlist",
    title: "Trading Watchlist",
    description: "Tracked markets and symbols ready for review.",
    icon: "W",
    category: "Trading",
    defaultSize: "md",
    defaultRow: "row-trading",
    canDuplicate: true,
    canDelete: true,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "emerald" }),
    component: renderTradingWatchlistWidget,
  },
  {
    id: "trading-performance",
    title: "Trading Performance",
    description: "Trade metrics and system performance summary.",
    icon: "T",
    category: "Trading",
    defaultSize: "md",
    defaultRow: "row-trading",
    canDuplicate: true,
    canDelete: true,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "cyan" }),
    component: renderTradingPerformanceWidget,
  },
  {
    id: "habit-tracker",
    title: "Habit Tracker",
    description: "Health and discipline habit completion at a glance.",
    icon: "H",
    category: "Health",
    defaultSize: "md",
    defaultRow: "row-health",
    canDuplicate: true,
    canDelete: true,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "rose" }),
    component: renderHabitTrackerWidget,
  },
  {
    id: "finance-overview",
    title: "Finance Overview",
    description: "Budget, savings, and runway snapshots.",
    icon: "$",
    category: "Finance",
    defaultSize: "md",
    defaultRow: "row-finance",
    canDuplicate: true,
    canDelete: true,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "amber" }),
    component: renderFinanceOverviewWidget,
  },
  {
    id: "social-feed",
    title: "Social Feed",
    description: "Updates and network signals from outside MENACE.",
    icon: "N",
    category: "Social",
    defaultSize: "md",
    defaultRow: "row-social",
    canDuplicate: true,
    canDelete: true,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "cyan" }),
    component: renderSocialFeedWidget,
  },
  {
    id: "ai-assistant",
    title: "AI Assistant",
    description: "Future planning and summarization assistant.",
    icon: "AI",
    category: "AI",
    defaultSize: "md",
    defaultRow: "row-ai",
    canDuplicate: true,
    canDelete: true,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "purple" }),
    component: renderAiAssistantWidget,
  },
  {
    id: "experimental-lab",
    title: "Experimental Lab",
    description: "Sandbox space for beta widget experiments.",
    icon: "X",
    category: "Experimental",
    defaultSize: "md",
    defaultRow: "row-experimental",
    canDuplicate: true,
    canDelete: true,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "rose" }),
    component: renderExperimentalLabWidget,
  },
  {
    id: "command-center-header",
    title: "Command Center Header",
    description: "Today's date, daily success ring, and the Finish Day / Night Review trigger.",
    icon: "CC",
    category: "Command Center",
    defaultSize: "xl",
    defaultRow: "row-command-center",
    canDuplicate: true,
    canDelete: true,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "purple", padding: "relaxed" }),
    component: renderCommandCenterHeaderWidget,
  },
  {
    id: "minimum-successful-day",
    title: "Minimum Successful Day",
    description: "Today's core quests and the minimum bar for a successful day.",
    icon: "MD",
    category: "Command Center",
    defaultSize: "lg",
    defaultRow: "row-minimum-day",
    canDuplicate: true,
    canDelete: true,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "cyan" }),
    component: renderMinimumSuccessfulDayWidget,
  },
  {
    id: "bonus-missions",
    title: "Bonus Missions",
    description: "Optional quests unlocked after the Minimum Successful Day is complete.",
    icon: "BM",
    category: "Command Center",
    defaultSize: "lg",
    defaultRow: "row-minimum-day",
    canDuplicate: true,
    canDelete: true,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "amber" }),
    component: renderBonusMissionsWidget,
  },
  {
    id: "night-review",
    title: "Night Review",
    description: "Finish Day trigger that opens the Night Review snapshot summary.",
    icon: "NR",
    category: "Command Center",
    defaultSize: "md",
    defaultRow: "row-night-review",
    canDuplicate: true,
    canDelete: true,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "purple" }),
    component: renderNightReviewWidget,
  },
  {
    id: "dream-progress",
    title: "Dream Progress",
    description: "Live long-term system status from the Goal Tree.",
    icon: "DP",
    category: "Command Center",
    defaultSize: "lg",
    defaultRow: "row-dream-attributes",
    canDuplicate: true,
    canDelete: true,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "purple" }),
    component: renderDreamProgressWidget,
  },
  {
    id: "attribute-overview",
    title: "Attribute Overview",
    description: "Live category growth across all MENACE attributes.",
    icon: "AO",
    category: "Command Center",
    defaultSize: "lg",
    defaultRow: "row-dream-attributes",
    canDuplicate: true,
    canDelete: true,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "cyan" }),
    component: renderAttributeOverviewWidget,
  },
  {
    id: "consistency-score",
    title: "Consistency Score",
    description: "Average daily success across recently reviewed days.",
    icon: "CS",
    category: "Command Center",
    defaultSize: "md",
    defaultRow: "row-daily-insight",
    canDuplicate: true,
    canDelete: true,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "amber" }),
    component: renderConsistencyScoreWidget,
  },
  {
    id: "today-progress-feed",
    title: "Today's Progress Feed",
    description: "Today's activity feed of quest, XP, and goal events.",
    icon: "TF",
    category: "Command Center",
    defaultSize: "md",
    defaultRow: "row-daily-insight",
    canDuplicate: true,
    canDelete: true,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "purple" }),
    component: renderTodayProgressFeedWidget,
  },
  {
    id: "tomorrow-preview",
    title: "Tomorrow Preview",
    description: "Tomorrow's scheduled core quests and the XP on the table.",
    icon: "TP",
    category: "Command Center",
    defaultSize: "md",
    defaultRow: "row-daily-insight",
    canDuplicate: true,
    canDelete: true,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "cyan" }),
    component: renderTomorrowPreviewWidget,
  },
  {
    id: "recent-milestones",
    title: "Recent Milestones",
    description: "Recently completed dreams, goals, and milestones.",
    icon: "RM",
    category: "Command Center",
    defaultSize: "lg",
    defaultRow: "row-milestones-xp",
    canDuplicate: true,
    canDelete: true,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "purple" }),
    component: renderRecentMilestonesWidget,
  },
  {
    id: "xp-overview",
    title: "XP Overview",
    description: "Weekly XP output chart across quests and goal XP.",
    icon: "XO",
    category: "Command Center",
    defaultSize: "lg",
    defaultRow: "row-milestones-xp",
    canDuplicate: true,
    canDelete: true,
    canHide: true,
    defaultSettings: createDefaultWidgetSettings({ accentColor: "cyan" }),
    component: renderXpOverviewWidget,
  },
];

const dashboardCatalogWidgetTypes = new Set<DashboardWidgetType>([
  "character",
  "daily-quests",
  "main-quest",
  "category-levels",
  "achievement",
  "statistics",
  "chart",
  "recent-activity",
  "trading-performance",
  "habit-tracker",
  "command-center-header",
  "minimum-successful-day",
  "bonus-missions",
  "night-review",
  "dream-progress",
  "attribute-overview",
  "consistency-score",
  "today-progress-feed",
  "tomorrow-preview",
  "recent-milestones",
  "xp-overview",
]);

export const dashboardWidgetCatalog = widgetRegistry.filter((definition) => dashboardCatalogWidgetTypes.has(definition.id));

export function getWidgetDefinition(type: DashboardWidgetType) {
  return widgetRegistry.find((definition) => definition.id === type) ?? null;
}

export function getWidgetDefinitionsByCategory(category: WidgetCategory) {
  return widgetRegistry.filter((definition) => definition.category === category);
}

export function getDefaultWidgetSettings(type: DashboardWidgetType) {
  return cloneWidgetSettings(getWidgetDefinition(type)?.defaultSettings ?? createDefaultWidgetSettings());
}

export function normalizeWidget(widget: DashboardWidget): DashboardWidget {
  const definition = getWidgetDefinition(widget.type);

  if (!definition) {
    return widget;
  }

  return {
    ...widget,
    title: widget.title || definition.title,
    size: widget.size ?? definition.defaultSize,
    settings: cloneWidgetSettings(widget.settings ?? definition.defaultSettings),
    config: widget.config ?? definition.defaultConfig,
  };
}

export function createWidgetFromType(type: DashboardWidgetType, overrides?: Readonly<Partial<DashboardWidget>>) {
  const definition = getWidgetDefinition(type);

  if (!definition) {
    return null;
  }

  return createWidgetInstance(definition, overrides);
}

export function getDefaultDashboardWidgetInstances() {
  return createDefaultWidgetOrder();
}
