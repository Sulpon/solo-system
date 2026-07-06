"use client";

import ChartWidget from "../../_components/dashboard/ChartWidget";
import { getAttributePortfolio } from "../attribute-portfolio";
import { getEventsByType } from "../activity-events";
import { getConsistencyScore } from "../daily-system";
import { calculateGoalTree, summarizeGoalTree, type GoalNodeView } from "../goal-tree-progress";
import { getLiveDreamProgress, getWeeklyXpSeries } from "../../_components/dashboard/dashboard-overview.utils";
import {
  EmptyWidgetState,
  MiniActivityFeed,
  MiniBars,
  MiniHeatmap,
  MiniProgressList,
  MiniRadar,
  StatValue,
  WidgetShell,
  combineXpEntries,
  getDailyXpBuckets,
  getLifetimeXpTotal,
  getMonthlyXpBuckets,
  getWeeklyXpBuckets,
  useWidgetLiveContext,
  type MiniProgressItem,
  type RadarItem,
  type WidgetLiveContext,
} from "./catalog-helpers";
import type { CatalogSupportedPage, CatalogWidgetComponentProps, CatalogWidgetDefinition, CatalogWidgetSize } from "./catalog-types";
import type { ActivityEvent, ActivityEventType } from "../types/activity-event";

const dashboardAndGoalPages: CatalogSupportedPage[] = ["dashboard", "goal-tree", "attributes", "quests"];
const dashboardOnly: CatalogSupportedPage[] = ["dashboard", "quests"];
const allSizes: CatalogWidgetSize[] = ["sm", "md", "lg", "xl"];

function flattenGoalNodes(nodes: ReadonlyArray<GoalNodeView>): GoalNodeView[] {
  return nodes.flatMap((node) => [node, ...flattenGoalNodes(node.children)]);
}

function keywordMatch(value: string | undefined, keywords: ReadonlyArray<string>) {
  const normalized = (value ?? "").toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function toMiniItem(node: GoalNodeView): MiniProgressItem {
  return { id: node.id, title: node.title, subtitle: node.description ?? node.type.replaceAll("_", " "), progress: node.progress };
}

// ---------------------------------------------------------------------------
// Generic widget factories. Every widget in the catalog is one of these
// shapes with different data wired in - preview and live share the exact
// same rendering, only the data source changes.
// ---------------------------------------------------------------------------

function progressListWidget(options: {
  eyebrow: string;
  title: string;
  previewItems: ReadonlyArray<MiniProgressItem>;
  getLiveItems: (ctx: WidgetLiveContext) => ReadonlyArray<MiniProgressItem>;
  emptyText: string;
}) {
  return function Component({ mode }: CatalogWidgetComponentProps) {
    const ctx = useWidgetLiveContext();
    const items = mode === "preview" ? options.previewItems : options.getLiveItems(ctx);

    return (
      <WidgetShell eyebrow={options.eyebrow} title={options.title}>
        <MiniProgressList items={items} emptyText={options.emptyText} />
      </WidgetShell>
    );
  };
}

function statGridWidget(options: {
  eyebrow: string;
  title: string;
  stats: ReadonlyArray<{ label: string; previewValue: string | number; getLiveValue: (ctx: WidgetLiveContext) => string | number }>;
  columns?: 2 | 3 | 4;
}) {
  return function Component({ mode }: CatalogWidgetComponentProps) {
    const ctx = useWidgetLiveContext();
    const columnsClass = options.columns === 4 ? "sm:grid-cols-4" : options.columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";

    return (
      <WidgetShell eyebrow={options.eyebrow} title={options.title}>
        <div className={"grid gap-3 " + columnsClass}>
          {options.stats.map((stat) => (
            <StatValue key={stat.label} label={stat.label} value={mode === "preview" ? stat.previewValue : stat.getLiveValue(ctx)} />
          ))}
        </div>
      </WidgetShell>
    );
  };
}

function barsWidget(options: {
  eyebrow: string;
  title: string;
  previewValues: ReadonlyArray<number>;
  previewLabels?: ReadonlyArray<string>;
  getLiveValues: (ctx: WidgetLiveContext) => { values: ReadonlyArray<number>; labels?: ReadonlyArray<string> };
}) {
  return function Component({ mode }: CatalogWidgetComponentProps) {
    const ctx = useWidgetLiveContext();
    const { values, labels } =
      mode === "preview" ? { values: options.previewValues, labels: options.previewLabels } : options.getLiveValues(ctx);

    return (
      <WidgetShell eyebrow={options.eyebrow} title={options.title}>
        <MiniBars values={values} labels={labels} />
      </WidgetShell>
    );
  };
}

function heatmapWidget(options: {
  eyebrow: string;
  title: string;
  columns: number;
  previewValues: ReadonlyArray<number>;
  getLiveValues: (ctx: WidgetLiveContext) => ReadonlyArray<number>;
}) {
  return function Component({ mode }: CatalogWidgetComponentProps) {
    const ctx = useWidgetLiveContext();
    const values = mode === "preview" ? options.previewValues : options.getLiveValues(ctx);

    return (
      <WidgetShell eyebrow={options.eyebrow} title={options.title}>
        <MiniHeatmap values={values} columns={options.columns} />
      </WidgetShell>
    );
  };
}

function radarWidget(options: {
  eyebrow: string;
  title: string;
  previewItems: ReadonlyArray<RadarItem>;
  getLiveItems: (ctx: WidgetLiveContext) => ReadonlyArray<RadarItem>;
}) {
  return function Component({ mode }: CatalogWidgetComponentProps) {
    const ctx = useWidgetLiveContext();
    const items = mode === "preview" ? options.previewItems : options.getLiveItems(ctx);

    return (
      <WidgetShell eyebrow={options.eyebrow} title={options.title}>
        <MiniRadar items={items} />
      </WidgetShell>
    );
  };
}

function activityFeedWidget(options: {
  eyebrow: string;
  title: string;
  previewEvents: ReadonlyArray<ActivityEvent>;
  getLiveEvents: (ctx: WidgetLiveContext) => ReadonlyArray<ActivityEvent>;
  emptyText: string;
}) {
  return function Component({ mode }: CatalogWidgetComponentProps) {
    const ctx = useWidgetLiveContext();
    const events = mode === "preview" ? options.previewEvents : options.getLiveEvents(ctx);

    return (
      <WidgetShell eyebrow={options.eyebrow} title={options.title}>
        <MiniActivityFeed events={events} emptyText={options.emptyText} />
      </WidgetShell>
    );
  };
}

function comingSoonWidget(options: { eyebrow: string; title: string; description: string; previewNode: React.ReactNode }) {
  return function Component({ mode }: CatalogWidgetComponentProps) {
    if (mode === "preview") {
      return <WidgetShell eyebrow={options.eyebrow} title={options.title}>{options.previewNode}</WidgetShell>;
    }

    return (
      <WidgetShell eyebrow={options.eyebrow} title={options.title}>
        <EmptyWidgetState text={options.description} />
      </WidgetShell>
    );
  };
}

const previewChartSeries = [20, 45, 30, 60, 25, 70, 40];

function chartWidgetComponent(title: string, chartType: "line" | "bar" | "area") {
  return function Component({ mode }: CatalogWidgetComponentProps) {
    if (mode === "preview") {
      return <ChartWidget title={title} config={{ chartType, metric: "xp", timeRange: "7d" }} previewSeries={previewChartSeries} />;
    }

    return <ChartWidget title={title} config={{ chartType, metric: "xp", timeRange: "30d" }} />;
  };
}

const previewDreams: MiniProgressItem[] = [
  { id: "p-dream-1", title: "Become a top trader", subtitle: "dream", progress: 62 },
  { id: "p-dream-2", title: "Build my physique", subtitle: "dream", progress: 41 },
  { id: "p-dream-3", title: "Ship a real career", subtitle: "dream", progress: 78 },
];

const previewGoals: MiniProgressItem[] = [
  { id: "p-goal-1", title: "Build a consistent trading process", subtitle: "goal", progress: 55 },
  { id: "p-goal-2", title: "Run a half marathon", subtitle: "goal", progress: 30 },
  { id: "p-goal-3", title: "Finish the certification", subtitle: "goal", progress: 88 },
];

const previewQuests: MiniProgressItem[] = [
  { id: "p-quest-1", title: "Journal every trade", subtitle: "Quest" },
  { id: "p-quest-2", title: "Train legs", subtitle: "Quest" },
  { id: "p-quest-3", title: "Read 20 pages", subtitle: "Quest" },
].map((item) => ({ ...item, progress: 0 }));

function previewEvent(id: string, title: string, description: string, type: ActivityEventType = "quest_completed"): ActivityEvent {
  return {
    id,
    type,
    createdAt: new Date().toISOString(),
    title,
    description,
    sourceType: "quest",
    sourceId: id,
    metadata: {},
  };
}

const previewActivity: ActivityEvent[] = [
  previewEvent("p-a1", "Journal every trade completed", "+25 XP"),
  previewEvent("p-a2", "Weekly Dream milestone hit", "Become a top trader", "milestone_completed"),
  previewEvent("p-a3", "Trading +40 XP", "Journal every trade", "attribute_xp_awarded"),
];

// ---------------------------------------------------------------------------
// Static registry. Legacy attribute-specific widgets (Trading/Career/Physical
// Health/Self Development) keep their original bespoke keyword-matched logic
// for continuity with pre-existing users, scoped only to their exact legacy
// attribute id - they are not shown for user-created attributes.
// ---------------------------------------------------------------------------

const staticWidgets: CatalogWidgetDefinition[] = [
  // ---------------- Daily System ----------------
  {
    id: "daily-minimum-successful-day-summary",
    title: "Minimum Successful Day",
    description: "Today's core quests and how close you are to a successful day.",
    category: "Daily System",
    icon: "MD",
    defaultSize: "md",
    allowedSizes: allSizes,
    supportedPages: dashboardOnly,
    readOnly: true,
    searchKeywords: ["daily", "minimum", "successful", "core quests"],
    component: statGridWidget({
      eyebrow: "Daily System",
      title: "Minimum Successful Day",
      stats: [
        { label: "Core Quests", previewValue: 3, getLiveValue: (ctx) => ctx.questDefinitions.filter((quest) => (quest.importance ?? "core") === "core").length },
        { label: "Success", previewValue: "67%", getLiveValue: () => "See Dashboard" },
      ],
    }),
  },
  {
    id: "daily-bonus-missions-summary",
    title: "Bonus Missions",
    description: "Optional missions unlocked after your minimum day is complete.",
    category: "Daily System",
    icon: "BM",
    defaultSize: "md",
    allowedSizes: allSizes,
    supportedPages: dashboardOnly,
    readOnly: true,
    searchKeywords: ["bonus", "missions", "optional quests"],
    component: statGridWidget({
      eyebrow: "Daily System",
      title: "Bonus Missions",
      stats: [{ label: "Bonus Quests", previewValue: 2, getLiveValue: (ctx) => ctx.questDefinitions.filter((quest) => (quest.importance ?? "core") === "bonus").length }],
    }),
  },
  {
    id: "daily-tomorrow-preview",
    title: "Tomorrow Preview",
    description: "Tomorrow's scheduled core quests and the XP on the table.",
    category: "Daily System",
    icon: "TP",
    defaultSize: "md",
    allowedSizes: allSizes,
    supportedPages: dashboardOnly,
    readOnly: true,
    searchKeywords: ["tomorrow", "preview", "schedule"],
    component: statGridWidget({
      eyebrow: "Daily System",
      title: "Tomorrow Preview",
      stats: [
        { label: "Core Quests", previewValue: 3, getLiveValue: (ctx) => ctx.questDefinitions.filter((quest) => (quest.importance ?? "core") === "core" && quest.status === "active").length },
        { label: "Available XP", previewValue: 75, getLiveValue: (ctx) => ctx.questDefinitions.filter((quest) => (quest.importance ?? "core") === "core").reduce((sum, quest) => sum + quest.xp, 0) },
      ],
    }),
  },
  {
    id: "daily-night-review-summary",
    title: "Night Review Summary",
    description: "Recap of the most recently reviewed day.",
    category: "Daily System",
    icon: "NR",
    defaultSize: "md",
    allowedSizes: allSizes,
    supportedPages: dashboardOnly,
    readOnly: true,
    searchKeywords: ["night", "review", "recap", "finish day"],
    component: statGridWidget({
      eyebrow: "Daily System",
      title: "Night Review Summary",
      stats: [
        { label: "Reviewed Days", previewValue: 12, getLiveValue: (ctx) => ctx.dailySnapshots.length },
        {
          label: "Last Success",
          previewValue: "80%",
          getLiveValue: (ctx) => (ctx.dailySnapshots.length > 0 ? `${ctx.dailySnapshots[ctx.dailySnapshots.length - 1].dailySuccessPercent}%` : "—"),
        },
      ],
    }),
  },
  {
    id: "daily-consistency-score",
    title: "Consistency Score",
    description: "Average daily success across recently reviewed days.",
    category: "Daily System",
    icon: "CS",
    defaultSize: "md",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["consistency", "score", "streak"],
    component: statGridWidget({
      eyebrow: "Daily System",
      title: "Consistency Score",
      stats: [
        { label: "Score", previewValue: "82%", getLiveValue: (ctx) => (ctx.dailySnapshots.length > 0 ? `${getConsistencyScore(ctx.dailySnapshots)}%` : "—") },
        { label: "Reviewed Days", previewValue: 12, getLiveValue: (ctx) => ctx.dailySnapshots.length },
      ],
    }),
  },
  {
    id: "daily-todays-progress",
    title: "Today's Progress",
    description: "XP earned and streak status for today.",
    category: "Daily System",
    icon: "TD",
    defaultSize: "md",
    allowedSizes: allSizes,
    supportedPages: dashboardOnly,
    readOnly: true,
    searchKeywords: ["today", "progress", "xp today"],
    component: statGridWidget({
      eyebrow: "Daily System",
      title: "Today's Progress",
      stats: [
        { label: "XP Today", previewValue: 65, getLiveValue: (ctx) => ctx.progressionSummary.dailyXP },
        { label: "Current Streak", previewValue: 5, getLiveValue: (ctx) => ctx.progressionSummary.currentStreak },
      ],
    }),
  },
  {
    id: "daily-core-quests-summary",
    title: "Today's Core Quests Summary",
    description: "Read-only summary of core quests scheduled for today.",
    category: "Daily System",
    icon: "CQ",
    defaultSize: "md",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["today", "core quests", "summary"],
    component: statGridWidget({
      eyebrow: "Daily System",
      title: "Today's Core Quests Summary",
      stats: [
        { label: "Scheduled", previewValue: 3, getLiveValue: (ctx) => ctx.questDefinitions.filter((quest) => (quest.importance ?? "core") === "core" && quest.status === "active").length },
        {
          label: "Completed",
          previewValue: 1,
          getLiveValue: (ctx) => {
            const today = new Date().toISOString().slice(0, 10);
            const coreQuestIds = new Set(ctx.questDefinitions.filter((quest) => (quest.importance ?? "core") === "core").map((quest) => quest.id));
            return ctx.questCompletions.filter((completion) => coreQuestIds.has(completion.questId) && completion.completedAt.slice(0, 10) === today).length;
          },
        },
      ],
    }),
  },
  {
    id: "daily-bonus-missions-summary-today",
    title: "Today's Bonus Missions Summary",
    description: "Read-only summary of bonus missions scheduled for today.",
    category: "Daily System",
    icon: "BQ",
    defaultSize: "md",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["today", "bonus missions", "summary"],
    component: statGridWidget({
      eyebrow: "Daily System",
      title: "Today's Bonus Missions Summary",
      stats: [
        { label: "Scheduled", previewValue: 2, getLiveValue: (ctx) => ctx.questDefinitions.filter((quest) => (quest.importance ?? "core") === "bonus" && quest.status === "active").length },
        {
          label: "Completed",
          previewValue: 0,
          getLiveValue: (ctx) => {
            const today = new Date().toISOString().slice(0, 10);
            const bonusQuestIds = new Set(ctx.questDefinitions.filter((quest) => (quest.importance ?? "core") === "bonus").map((quest) => quest.id));
            return ctx.questCompletions.filter((completion) => bonusQuestIds.has(completion.questId) && completion.completedAt.slice(0, 10) === today).length;
          },
        },
      ],
    }),
  },

  // ---------------- Dreams ----------------
  {
    id: "dreams-dream-progress",
    title: "Dream Progress",
    description: "Live long-term system status across all dreams.",
    category: "Dreams",
    icon: "DP",
    defaultSize: "lg",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["dream", "progress", "long term"],
    component: progressListWidget({
      eyebrow: "Dreams",
      title: "Dream Progress",
      previewItems: previewDreams,
      getLiveItems: (ctx) => getLiveDreamProgress(ctx.goalTree),
      emptyText: "Create your first dream in Goal Tree to start tracking long-term progress.",
    }),
  },
  {
    id: "dreams-dream-completion",
    title: "Dream Completion",
    description: "How many of your dreams are fully complete.",
    category: "Dreams",
    icon: "DC",
    defaultSize: "sm",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["dream", "completion", "complete"],
    component: statGridWidget({
      eyebrow: "Dreams",
      title: "Dream Completion",
      stats: [
        {
          label: "Completed",
          previewValue: "1 / 3",
          getLiveValue: (ctx) => {
            const dreams = calculateGoalTree(ctx.goalTree);
            const completed = dreams.filter((dream) => dream.progress >= 100 || dream.status === "completed").length;
            return `${completed} / ${dreams.length}`;
          },
        },
      ],
    }),
  },
  {
    id: "dreams-dream-xp",
    title: "Dream XP",
    description: "Total XP earned directly from dream-level events.",
    category: "Dreams",
    icon: "DX",
    defaultSize: "sm",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["dream", "xp"],
    component: statGridWidget({
      eyebrow: "Dreams",
      title: "Dream XP",
      stats: [
        {
          label: "Dream XP",
          previewValue: 180,
          getLiveValue: (ctx) => getEventsByType(ctx.activityEvents, "goal_xp_awarded").filter((event) => event.sourceType === "dream").reduce((sum, event) => sum + (typeof event.metadata.xp === "number" ? event.metadata.xp : 0), 0),
        },
      ],
    }),
  },

  // ---------------- Goals ----------------
  {
    id: "goals-near-completion",
    title: "Goals Near Completion",
    description: "Long-term goals that are close to being finished.",
    category: "Goals",
    icon: "GN",
    defaultSize: "lg",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["goals", "near completion", "almost done"],
    component: progressListWidget({
      eyebrow: "Goals",
      title: "Goals Near Completion",
      previewItems: [
        { id: "p-gn-1", title: "Finish trading playbook", subtitle: "goal", progress: 92 },
        { id: "p-gn-2", title: "Complete mobility routine", subtitle: "goal", progress: 85 },
      ],
      getLiveItems: (ctx) =>
        flattenGoalNodes(calculateGoalTree(ctx.goalTree))
          .filter((node) => node.type === "long_term_goal" && node.progress >= 70 && node.progress < 100)
          .map(toMiniItem),
      emptyText: "No goals close to completion yet.",
    }),
  },
  {
    id: "goals-overall",
    title: "Overall Goals",
    description: "Total goals and how many are complete.",
    category: "Goals",
    icon: "OG",
    defaultSize: "sm",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["overall", "goals", "total"],
    component: statGridWidget({
      eyebrow: "Goals",
      title: "Overall Goals",
      stats: [
        {
          label: "Total",
          previewValue: 6,
          getLiveValue: (ctx) => flattenGoalNodes(calculateGoalTree(ctx.goalTree)).filter((node) => node.type === "long_term_goal").length,
        },
        {
          label: "Completed",
          previewValue: 2,
          getLiveValue: (ctx) => flattenGoalNodes(calculateGoalTree(ctx.goalTree)).filter((node) => node.type === "long_term_goal" && (node.progress >= 100 || node.status === "completed")).length,
        },
      ],
    }),
  },
  {
    id: "goals-recent",
    title: "Recent Goals",
    description: "Goals updated most recently.",
    category: "Goals",
    icon: "RG",
    defaultSize: "lg",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["recent", "goals", "updated"],
    component: progressListWidget({
      eyebrow: "Goals",
      title: "Recent Goals",
      previewItems: previewGoals,
      getLiveItems: (ctx) =>
        flattenGoalNodes(calculateGoalTree(ctx.goalTree))
          .filter((node) => node.type === "long_term_goal")
          .sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime())
          .slice(0, 6)
          .map(toMiniItem),
      emptyText: "No goals yet.",
    }),
  },
  {
    id: "goals-goal-progress",
    title: "Goal Progress",
    description: "Progress of your top active goals.",
    category: "Goals",
    icon: "GP",
    defaultSize: "lg",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["goal", "progress"],
    component: progressListWidget({
      eyebrow: "Goals",
      title: "Goal Progress",
      previewItems: previewGoals,
      getLiveItems: (ctx) =>
        flattenGoalNodes(calculateGoalTree(ctx.goalTree))
          .filter((node) => node.type === "long_term_goal" && node.status !== "completed")
          .map(toMiniItem),
      emptyText: "Active goals will appear here.",
    }),
  },
  {
    id: "goals-progress-goals-near-completion",
    title: "Progress Goals Near Completion",
    description: "Progress goals that are close to their target value.",
    category: "Goals",
    icon: "PN",
    defaultSize: "lg",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["progress goals", "near completion"],
    component: progressListWidget({
      eyebrow: "Goals",
      title: "Progress Goals Near Completion",
      previewItems: [{ id: "p-pn-1", title: "Log 100 trades", subtitle: "88 / 100 trades", progress: 88 }],
      getLiveItems: (ctx) => flattenGoalNodes(calculateGoalTree(ctx.goalTree)).filter((node) => node.type === "progress_goal" && node.progress >= 70 && node.progress < 100).map(toMiniItem),
      emptyText: "No progress goals near completion yet.",
    }),
  },

  // ---------------- Progress ----------------
  {
    id: "progress-overall",
    title: "Overall Progress",
    description: "Aggregate progress across your entire goal tree.",
    category: "Progress",
    icon: "OP",
    defaultSize: "sm",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["overall", "progress"],
    component: statGridWidget({
      eyebrow: "Progress",
      title: "Overall Progress",
      stats: [{ label: "Progress", previewValue: "58%", getLiveValue: (ctx) => `${summarizeGoalTree(ctx.goalTree).progress}%` }],
    }),
  },
  {
    id: "progress-overall-completion",
    title: "Overall Completion",
    description: "Completed dreams, goals, milestones, and progress goals.",
    category: "Progress",
    icon: "OC",
    defaultSize: "md",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["overall", "completion"],
    component: statGridWidget({
      eyebrow: "Progress",
      title: "Overall Completion",
      columns: 3,
      stats: [
        { label: "Progress", previewValue: "58%", getLiveValue: (ctx) => `${summarizeGoalTree(ctx.goalTree).progress}%` },
        { label: "Completed", previewValue: 3, getLiveValue: (ctx) => summarizeGoalTree(ctx.goalTree).completedChildrenCount },
        { label: "Total", previewValue: 6, getLiveValue: (ctx) => summarizeGoalTree(ctx.goalTree).directChildrenCount },
      ],
    }),
  },
  {
    id: "progress-completion-percent",
    title: "Completion %",
    description: "Share of direct children marked complete.",
    category: "Progress",
    icon: "C%",
    defaultSize: "sm",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["completion", "percent", "%"],
    component: statGridWidget({
      eyebrow: "Progress",
      title: "Completion %",
      stats: [
        {
          label: "Completed",
          previewValue: "42%",
          getLiveValue: (ctx) => {
            const summary = summarizeGoalTree(ctx.goalTree);
            return summary.directChildrenCount === 0 ? "—" : `${Math.round((summary.completedChildrenCount / summary.directChildrenCount) * 100)}%`;
          },
        },
      ],
    }),
  },
  {
    id: "progress-weekly",
    title: "Weekly Progress",
    description: "Daily success percentage across the last 7 days.",
    category: "Progress",
    icon: "WP",
    defaultSize: "md",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["weekly", "progress", "success"],
    component: barsWidget({
      eyebrow: "Progress",
      title: "Weekly Progress",
      previewValues: [40, 60, 80, 100, 70, 90, 50],
      previewLabels: ["M", "T", "W", "T", "F", "S", "S"],
      getLiveValues: (ctx) => {
        const byDay = new Map(ctx.dailySnapshots.map((snapshot) => [snapshot.date, snapshot.dailySuccessPercent]));
        const today = new Date();
        const values: number[] = [];
        for (let index = 6; index >= 0; index -= 1) {
          const date = new Date(today);
          date.setDate(date.getDate() - index);
          const key = date.toISOString().slice(0, 10);
          values.push(byDay.get(key) ?? 0);
        }
        return { values, labels: ["M", "T", "W", "T", "F", "S", "S"] };
      },
    }),
  },
  {
    id: "progress-monthly",
    title: "Monthly Progress",
    description: "XP output across the last 4 weeks.",
    category: "Progress",
    icon: "MP",
    defaultSize: "md",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["monthly", "progress"],
    component: barsWidget({
      eyebrow: "Progress",
      title: "Monthly Progress",
      previewValues: [220, 340, 260, 410],
      previewLabels: ["W1", "W2", "W3", "W4"],
      getLiveValues: (ctx) => ({ values: getWeeklyXpBuckets(combineXpEntries(ctx.questCompletions, ctx.goalXpEvents)), labels: ["W1", "W2", "W3", "W4"] }),
    }),
  },
  {
    id: "progress-yearly",
    title: "Yearly Progress",
    description: "XP output by month across the current year.",
    category: "Progress",
    icon: "YP",
    defaultSize: "lg",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["yearly", "progress"],
    component: barsWidget({
      eyebrow: "Progress",
      title: "Yearly Progress",
      previewValues: [120, 90, 200, 180, 260, 300, 240, 280, 310, 260, 220, 340],
      getLiveValues: (ctx) => getMonthlyXpBuckets(combineXpEntries(ctx.questCompletions, ctx.goalXpEvents)),
    }),
  },
  {
    id: "progress-heatmap",
    title: "Progress Heatmap",
    description: "Daily XP intensity across the last 28 days.",
    category: "Progress",
    icon: "PH",
    defaultSize: "lg",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["progress", "heatmap"],
    component: heatmapWidget({
      eyebrow: "Progress",
      title: "Progress Heatmap",
      columns: 7,
      previewValues: Array.from({ length: 28 }, (_, index) => (index % 4 === 0 ? 0 : Math.round(Math.random() * 80 + 10))),
      getLiveValues: (ctx) => getDailyXpBuckets(combineXpEntries(ctx.questCompletions, ctx.goalXpEvents), 28),
    }),
  },

  // ---------------- Attributes ----------------
  {
    id: "attributes-overview",
    title: "Attribute Overview",
    description: "Live category growth across all your attributes.",
    category: "Attributes",
    icon: "AO",
    defaultSize: "lg",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["attribute", "overview"],
    component: progressListWidget({
      eyebrow: "Attributes",
      title: "Attribute Overview",
      previewItems: [
        { id: "p-attr-1", title: "Trading", subtitle: "Level 3", progress: 64 },
        { id: "p-attr-2", title: "Discipline", subtitle: "Level 4", progress: 48 },
        { id: "p-attr-3", title: "Self Development", subtitle: "Level 2", progress: 71 },
      ],
      getLiveItems: (ctx) => ctx.progressionSummary.categoryProgression.map((category) => ({ id: category.id, title: category.name, subtitle: `Level ${category.level}`, progress: category.progress })),
      emptyText: "Create attributes in onboarding or Settings to see them here.",
    }),
  },
  {
    id: "attributes-levels",
    title: "Attribute Levels",
    description: "All attributes with level and XP progress.",
    category: "Attributes",
    icon: "AL",
    defaultSize: "lg",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["attribute", "levels"],
    component: progressListWidget({
      eyebrow: "Attributes",
      title: "Attribute Levels",
      previewItems: [
        { id: "p-lvl-1", title: "Trading", subtitle: "Level 3 · 1,240 XP", progress: 64 },
        { id: "p-lvl-2", title: "Discipline", subtitle: "Level 4 · 1,860 XP", progress: 48 },
      ],
      getLiveItems: (ctx) => ctx.progressionSummary.categoryProgression.map((category) => ({ id: category.id, title: category.name, subtitle: `Level ${category.level} · ${category.xp.toLocaleString()} XP`, progress: category.progress })),
      emptyText: "No attributes yet.",
    }),
  },
  {
    id: "attributes-xp",
    title: "Attribute XP",
    description: "XP total per attribute.",
    category: "Attributes",
    icon: "AX",
    defaultSize: "lg",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["attribute", "xp"],
    component: function Component({ mode }: CatalogWidgetComponentProps) {
      const ctx = useWidgetLiveContext();
      const items =
        mode === "preview"
          ? [
              { id: "trading", name: "Trading", xp: 1240 },
              { id: "discipline", name: "Discipline", xp: 1860 },
            ]
          : ctx.progressionSummary.categoryProgression.map((category) => ({ id: category.id, name: category.name, xp: category.xp }));

      return (
        <WidgetShell eyebrow="Attributes" title="Attribute XP">
          {items.length === 0 ? (
            <EmptyWidgetState text="No attributes yet." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <StatValue key={item.id} label={item.name} value={item.xp} />
              ))}
            </div>
          )}
        </WidgetShell>
      );
    },
  },
  {
    id: "attributes-xp-today",
    title: "Attribute XP Today",
    description: "XP gained today, broken down by attribute.",
    category: "Attributes",
    icon: "AXT",
    defaultSize: "lg",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["attribute", "xp", "today"],
    component: function Component({ mode }: CatalogWidgetComponentProps) {
      const ctx = useWidgetLiveContext();
      const items =
        mode === "preview"
          ? [
              { id: "trading", name: "Trading", xp: 25 },
              { id: "discipline", name: "Discipline", xp: 15 },
            ]
          : ctx.progressionSummary.categoryProgression.map((category) => {
              const today = new Date().toISOString().slice(0, 10);
              const xp = getEventsByType(ctx.activityEvents, "attribute_xp_awarded")
                .filter((event) => event.metadata.attributeId === category.id && event.createdAt.slice(0, 10) === today)
                .reduce((sum, event) => sum + (typeof event.metadata.xp === "number" ? event.metadata.xp : 0), 0);
              return { id: category.id, name: category.name, xp };
            });

      return (
        <WidgetShell eyebrow="Attributes" title="Attribute XP Today">
          {items.length === 0 ? (
            <EmptyWidgetState text="No attributes yet." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <StatValue key={item.id} label={item.name} value={item.xp} />
              ))}
            </div>
          )}
        </WidgetShell>
      );
    },
  },
  {
    id: "attributes-balance",
    title: "Attribute Balance",
    description: "Distribution of XP across attributes.",
    category: "Attributes",
    icon: "AB",
    defaultSize: "lg",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["attribute", "balance", "distribution"],
    component: progressListWidget({
      eyebrow: "Attributes",
      title: "Attribute Balance",
      previewItems: [
        { id: "p-bal-1", title: "Trading", subtitle: "1,240 XP", progress: 40 },
        { id: "p-bal-2", title: "Discipline", subtitle: "1,860 XP", progress: 60 },
      ],
      getLiveItems: (ctx) => {
        const total = Math.max(1, ctx.progressionSummary.categoryProgression.reduce((sum, category) => sum + category.xp, 0));
        return ctx.progressionSummary.categoryProgression.map((category) => ({ id: category.id, title: category.name, subtitle: `${category.xp.toLocaleString()} XP`, progress: Math.round((category.xp / total) * 100) }));
      },
      emptyText: "No attribute XP yet.",
    }),
  },
  {
    id: "attributes-radar",
    title: "Radar Chart",
    description: "Visual balance of all attributes on one radar.",
    category: "Attributes",
    icon: "RC",
    defaultSize: "md",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["radar", "chart", "attribute", "balance"],
    component: radarWidget({
      eyebrow: "Attributes",
      title: "Radar Chart",
      previewItems: [
        { label: "Trading", value: 64 },
        { label: "Discipline", value: 48 },
        { label: "Self Development", value: 71 },
        { label: "Career", value: 35 },
      ],
      getLiveItems: (ctx) => ctx.progressionSummary.categoryProgression.map((category) => ({ label: category.name, value: category.progress })),
    }),
  },
  {
    id: "attributes-level-history",
    title: "Level History",
    description: "Current level standing per attribute.",
    category: "Attributes",
    icon: "LH",
    defaultSize: "md",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["level", "history"],
    component: barsWidget({
      eyebrow: "Attributes",
      title: "Level History",
      previewValues: [3, 4, 2, 5],
      previewLabels: ["Trading", "Discipline", "Career", "Self Dev"],
      getLiveValues: (ctx) => ({
        values: ctx.progressionSummary.categoryProgression.map((category) => category.level),
        labels: ctx.progressionSummary.categoryProgression.map((category) => category.name.slice(0, 3)),
      }),
    }),
  },
  {
    id: "attributes-top-growing",
    title: "Top Growing Attribute",
    description: "The attribute that gained the most XP this week.",
    category: "Attributes",
    icon: "TG",
    defaultSize: "sm",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["top", "growing", "attribute"],
    component: function Component({ mode }: CatalogWidgetComponentProps) {
      const ctx = useWidgetLiveContext();

      if (mode === "preview") {
        return (
          <WidgetShell eyebrow="Attributes" title="Top Growing Attribute">
            <StatValue label="Trading" value="+120 XP" />
          </WidgetShell>
        );
      }

      const gains = ctx.progressionSummary.categoryProgression
        .map((category) => ({
          category,
          xp: getEventsByType(ctx.activityEvents, "attribute_xp_awarded").filter((event) => event.metadata.attributeId === category.id).reduce((sum, event) => sum + (typeof event.metadata.xp === "number" ? event.metadata.xp : 0), 0),
        }))
        .sort((first, second) => second.xp - first.xp);
      const top = gains[0];

      return (
        <WidgetShell eyebrow="Attributes" title="Top Growing Attribute">
          {top && top.xp > 0 ? <StatValue label={top.category.name} value={`+${top.xp.toLocaleString()} XP`} /> : <EmptyWidgetState text="No attribute XP gained yet." />}
        </WidgetShell>
      );
    },
  },

  // ---------------- Analytics ----------------
  {
    id: "analytics-xp-today",
    title: "XP Today",
    description: "Total XP earned today.",
    category: "Analytics",
    icon: "XT",
    defaultSize: "sm",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["xp", "today"],
    component: statGridWidget({
      eyebrow: "Analytics",
      title: "XP Today",
      stats: [{ label: "Activity XP", previewValue: 65, getLiveValue: (ctx) => ctx.progressionSummary.dailyXP }],
    }),
  },
  {
    id: "analytics-xp-this-week",
    title: "XP This Week",
    description: "Total XP earned so far this week.",
    category: "Analytics",
    icon: "XW",
    defaultSize: "sm",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["xp", "this week", "weekly"],
    component: statGridWidget({
      eyebrow: "Analytics",
      title: "XP This Week",
      stats: [{ label: "Activity XP", previewValue: 410, getLiveValue: (ctx) => ctx.progressionSummary.weeklyXP }],
    }),
  },
  {
    id: "analytics-weekly-xp",
    title: "Weekly XP",
    description: "XP output for each day of the current week.",
    category: "Analytics",
    icon: "WX",
    defaultSize: "md",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["xp", "weekly xp", "week"],
    component: barsWidget({
      eyebrow: "Analytics",
      title: "Weekly XP",
      previewValues: [20, 45, 30, 60, 25, 70, 40],
      previewLabels: ["M", "T", "W", "T", "F", "S", "S"],
      getLiveValues: (ctx) => {
        const series = getWeeklyXpSeries(ctx.questCompletions, ctx.goalXpEvents);
        return { values: series.map((bucket) => bucket.value), labels: series.map((bucket) => bucket.label) };
      },
    }),
  },
  {
    id: "analytics-monthly-xp",
    title: "Monthly XP",
    description: "XP output across the last 4 weeks.",
    category: "Analytics",
    icon: "MX",
    defaultSize: "md",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["xp", "monthly xp", "month"],
    component: barsWidget({
      eyebrow: "Analytics",
      title: "Monthly XP",
      previewValues: [220, 340, 260, 410],
      previewLabels: ["W1", "W2", "W3", "W4"],
      getLiveValues: (ctx) => ({ values: getWeeklyXpBuckets(combineXpEntries(ctx.questCompletions, ctx.goalXpEvents)), labels: ["W1", "W2", "W3", "W4"] }),
    }),
  },
  {
    id: "analytics-yearly-xp",
    title: "Yearly XP",
    description: "XP output by month for the current year.",
    category: "Analytics",
    icon: "YX",
    defaultSize: "lg",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["xp", "yearly xp", "year"],
    component: barsWidget({
      eyebrow: "Analytics",
      title: "Yearly XP",
      previewValues: [120, 90, 200, 180, 260, 300, 240, 280, 310, 260, 220, 340],
      getLiveValues: (ctx) => getMonthlyXpBuckets(combineXpEntries(ctx.questCompletions, ctx.goalXpEvents)),
    }),
  },
  {
    id: "analytics-lifetime-xp",
    title: "Lifetime XP",
    description: "Total XP earned across the lifetime of your account.",
    category: "Analytics",
    icon: "LX",
    defaultSize: "sm",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["xp", "lifetime", "total"],
    component: statGridWidget({
      eyebrow: "Analytics",
      title: "Lifetime XP",
      stats: [{ label: "Total XP", previewValue: 12480, getLiveValue: (ctx) => getLifetimeXpTotal(combineXpEntries(ctx.questCompletions, ctx.goalXpEvents)) }],
    }),
  },
  {
    id: "analytics-xp-heatmap",
    title: "XP Heatmap",
    description: "Daily XP intensity across the last 28 days.",
    category: "Analytics",
    icon: "XH",
    defaultSize: "lg",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["xp", "heatmap"],
    component: heatmapWidget({
      eyebrow: "Analytics",
      title: "XP Heatmap",
      columns: 7,
      previewValues: Array.from({ length: 28 }, (_, index) => (index % 5 === 0 ? 0 : Math.round(Math.random() * 80 + 10))),
      getLiveValues: (ctx) => getDailyXpBuckets(combineXpEntries(ctx.questCompletions, ctx.goalXpEvents), 28),
    }),
  },
  {
    id: "analytics-xp-calendar",
    title: "XP Calendar",
    description: "Daily XP intensity across the last 90 days.",
    category: "Analytics",
    icon: "XC",
    defaultSize: "xl",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["xp", "calendar"],
    component: heatmapWidget({
      eyebrow: "Analytics",
      title: "XP Calendar",
      columns: 15,
      previewValues: Array.from({ length: 90 }, (_, index) => (index % 6 === 0 ? 0 : Math.round(Math.random() * 80 + 10))),
      getLiveValues: (ctx) => getDailyXpBuckets(combineXpEntries(ctx.questCompletions, ctx.goalXpEvents), 90),
    }),
  },

  // ---------------- Activity ----------------
  {
    id: "activity-feed",
    title: "Activity Feed",
    description: "Recent activity events across the whole app.",
    category: "Activity",
    icon: "AF",
    defaultSize: "lg",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["activity", "feed", "recent"],
    component: activityFeedWidget({
      eyebrow: "Activity",
      title: "Activity Feed",
      previewEvents: previewActivity,
      getLiveEvents: (ctx) => ctx.activityEvents,
      emptyText: "Complete quests to generate activity.",
    }),
  },
  {
    id: "activity-recent-xp",
    title: "Recent XP",
    description: "The latest XP awards from quests, goals, and attributes.",
    category: "Activity",
    icon: "RX",
    defaultSize: "lg",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["recent", "xp", "activity"],
    component: activityFeedWidget({
      eyebrow: "Activity",
      title: "Recent XP",
      previewEvents: previewActivity.filter((event) => event.type !== "quest_completed"),
      getLiveEvents: (ctx) => [...getEventsByType(ctx.activityEvents, "quest_xp_awarded"), ...getEventsByType(ctx.activityEvents, "goal_xp_awarded"), ...getEventsByType(ctx.activityEvents, "attribute_xp_awarded")].sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()),
      emptyText: "Complete quests or goals to see XP activity here.",
    }),
  },
  {
    id: "activity-recent-quests",
    title: "Recent Quests",
    description: "Recently completed quests.",
    category: "Activity",
    icon: "RQ",
    defaultSize: "lg",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["recent", "quests", "completed"],
    component: activityFeedWidget({
      eyebrow: "Activity",
      title: "Recent Quests",
      previewEvents: [previewEvent("p-rq-1", "Journal every trade", "+25 XP"), previewEvent("p-rq-2", "Train legs", "+30 XP")],
      getLiveEvents: (ctx) => getEventsByType(ctx.activityEvents, "quest_completed"),
      emptyText: "Complete quests to see them here.",
    }),
  },
  {
    id: "activity-recent-milestones",
    title: "Recent Milestones",
    description: "Recently completed milestones and progress goals.",
    category: "Activity",
    icon: "RM",
    defaultSize: "lg",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["recent", "milestones"],
    component: activityFeedWidget({
      eyebrow: "Activity",
      title: "Recent Milestones",
      previewEvents: [previewEvent("p-rm-1", "First 100 backtests", "Milestone completed", "milestone_completed")],
      getLiveEvents: (ctx) => [...getEventsByType(ctx.activityEvents, "milestone_completed"), ...getEventsByType(ctx.activityEvents, "progress_goal_completed")].sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()),
      emptyText: "No milestones completed yet.",
    }),
  },
  {
    id: "activity-recent-dreams",
    title: "Recent Dreams",
    description: "Dreams completed most recently.",
    category: "Activity",
    icon: "RD",
    defaultSize: "md",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["recent", "dreams"],
    component: activityFeedWidget({
      eyebrow: "Activity",
      title: "Recent Dreams",
      previewEvents: [previewEvent("p-rd-1", "Become a top trader completed", "Dream completed", "dream_completed")],
      getLiveEvents: (ctx) => getEventsByType(ctx.activityEvents, "dream_completed"),
      emptyText: "No dreams completed yet.",
    }),
  },
  {
    id: "activity-recent-level-ups",
    title: "Recent Level Ups",
    description: "Attribute level-up moments over time.",
    category: "Activity",
    icon: "LU",
    defaultSize: "md",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["level up", "recent"],
    component: comingSoonWidget({
      eyebrow: "Activity",
      title: "Recent Level Ups",
      description: "Level-up history tracking is not recorded yet.",
      previewNode: <MiniActivityFeed events={[previewEvent("p-lu-1", "Trading reached Level 4", "Level up!")]} />,
    }),
  },

  // ---------------- History ----------------
  {
    id: "history-timeline",
    title: "History Timeline",
    description: "A full chronological feed of everything that's happened.",
    category: "History",
    icon: "HT",
    defaultSize: "xl",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["history", "timeline", "log"],
    component: activityFeedWidget({
      eyebrow: "History",
      title: "History Timeline",
      previewEvents: previewActivity,
      getLiveEvents: (ctx) => ctx.activityEvents,
      emptyText: "Your activity timeline will appear here.",
    }),
  },

  // ---------------- Focus ----------------
  {
    id: "focus-time-today",
    title: "Focus Time Today",
    description: "Deep work minutes logged today.",
    category: "Focus",
    icon: "FT",
    defaultSize: "sm",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["focus", "time", "today"],
    component: comingSoonWidget({
      eyebrow: "Focus",
      title: "Focus Time Today",
      description: "Focus tracking is not connected yet.",
      previewNode: <StatValue label="Minutes" value={95} />,
    }),
  },
  {
    id: "focus-weekly",
    title: "Weekly Focus",
    description: "Deep work minutes across the current week.",
    category: "Focus",
    icon: "WF",
    defaultSize: "md",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["focus", "weekly"],
    component: comingSoonWidget({
      eyebrow: "Focus",
      title: "Weekly Focus",
      description: "Focus tracking is not connected yet.",
      previewNode: <MiniBars values={[45, 60, 30, 90, 50, 20, 70]} labels={["M", "T", "W", "T", "F", "S", "S"]} />,
    }),
  },
  {
    id: "focus-deep-work",
    title: "Deep Work",
    description: "Longest uninterrupted focus session.",
    category: "Focus",
    icon: "DW",
    defaultSize: "sm",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["deep work", "focus"],
    component: comingSoonWidget({
      eyebrow: "Focus",
      title: "Deep Work",
      description: "Deep work tracking is not connected yet.",
      previewNode: <StatValue label="Longest Session" value="90 min" />,
    }),
  },
  {
    id: "focus-pomodoro",
    title: "Pomodoro",
    description: "Completed pomodoro sessions today.",
    category: "Focus",
    icon: "PM",
    defaultSize: "sm",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["pomodoro", "sessions"],
    component: comingSoonWidget({
      eyebrow: "Focus",
      title: "Pomodoro",
      description: "Pomodoro tracking is not connected yet.",
      previewNode: <StatValue label="Sessions" value={4} />,
    }),
  },

  // ---------------- Time ----------------
  {
    id: "time-distribution",
    title: "Time Distribution",
    description: "When during the day you're most active.",
    category: "Time",
    icon: "TD2",
    defaultSize: "lg",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["time", "distribution", "hour"],
    component: barsWidget({
      eyebrow: "Time",
      title: "Time Distribution",
      previewValues: [2, 1, 0, 0, 1, 3, 6, 8, 5, 4, 3, 2, 4, 5, 3, 2, 4, 6, 7, 5, 3, 2, 1, 1],
      getLiveValues: (ctx) => {
        const buckets = new Array(24).fill(0);
        for (const event of ctx.activityEvents) {
          const hour = new Date(event.createdAt).getHours();
          buckets[hour] += 1;
        }
        return { values: buckets };
      },
    }),
  },
  {
    id: "time-attribute-distribution",
    title: "Attribute Distribution",
    description: "Share of total XP contributed by each attribute.",
    category: "Time",
    icon: "AD",
    defaultSize: "lg",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["attribute", "distribution"],
    component: progressListWidget({
      eyebrow: "Time",
      title: "Attribute Distribution",
      previewItems: [
        { id: "p-ad-1", title: "Trading", subtitle: "1,240 XP", progress: 40 },
        { id: "p-ad-2", title: "Discipline", subtitle: "1,860 XP", progress: 60 },
      ],
      getLiveItems: (ctx) => {
        const total = Math.max(1, ctx.progressionSummary.categoryProgression.reduce((sum, category) => sum + category.xp, 0));
        return ctx.progressionSummary.categoryProgression.map((category) => ({ id: category.id, title: category.name, subtitle: `${category.xp.toLocaleString()} XP`, progress: Math.round((category.xp / total) * 100) }));
      },
      emptyText: "No attribute XP yet.",
    }),
  },
  {
    id: "time-dream-distribution",
    title: "Dream Distribution",
    description: "Share of overall progress contributed by each dream.",
    category: "Time",
    icon: "DD",
    defaultSize: "lg",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["dream", "distribution"],
    component: progressListWidget({
      eyebrow: "Time",
      title: "Dream Distribution",
      previewItems: [
        { id: "p-dd-1", title: "Become a top trader", subtitle: "share of progress", progress: 45 },
        { id: "p-dd-2", title: "Build my physique", subtitle: "share of progress", progress: 30 },
        { id: "p-dd-3", title: "Ship a real career", subtitle: "share of progress", progress: 25 },
      ],
      getLiveItems: (ctx) => {
        const dreams = calculateGoalTree(ctx.goalTree);
        const total = Math.max(1, dreams.reduce((sum, dream) => sum + dream.progress, 0));
        return dreams.map((dream) => ({ id: dream.id, title: dream.title, subtitle: "share of progress", progress: Math.round((dream.progress / total) * 100) }));
      },
      emptyText: "Create dreams to see their share of overall progress.",
    }),
  },

  // ---------------- Charts ----------------
  {
    id: "charts-xp-line",
    title: "XP Line Chart",
    description: "XP output over time as a line chart.",
    category: "Charts",
    icon: "LC",
    defaultSize: "xl",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["xp", "line", "chart"],
    component: chartWidgetComponent("XP Line Chart", "line"),
  },
  {
    id: "charts-radar",
    title: "Radar",
    description: "Visual balance of all attributes on one radar.",
    category: "Charts",
    icon: "RD2",
    defaultSize: "md",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["radar", "chart"],
    component: radarWidget({
      eyebrow: "Charts",
      title: "Radar",
      previewItems: [
        { label: "Trading", value: 64 },
        { label: "Discipline", value: 48 },
        { label: "Self Development", value: 71 },
        { label: "Career", value: 35 },
      ],
      getLiveItems: (ctx) => ctx.progressionSummary.categoryProgression.map((category) => ({ label: category.name, value: category.progress })),
    }),
  },
  {
    id: "charts-bar",
    title: "Bar Chart",
    description: "XP output over time as a bar chart.",
    category: "Charts",
    icon: "BC",
    defaultSize: "xl",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["bar", "chart"],
    component: chartWidgetComponent("Bar Chart", "bar"),
  },
  {
    id: "charts-area",
    title: "Area Chart",
    description: "XP output over time as a filled area chart.",
    category: "Charts",
    icon: "AC",
    defaultSize: "xl",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["area", "chart"],
    component: chartWidgetComponent("Area Chart", "area"),
  },
  {
    id: "charts-goal-burndown",
    title: "Goal Burndown",
    description: "Remaining vs. completed nodes across your goal tree.",
    category: "Charts",
    icon: "GB",
    defaultSize: "md",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["goal", "burndown"],
    component: barsWidget({
      eyebrow: "Charts",
      title: "Goal Burndown",
      previewValues: [8, 3],
      previewLabels: ["Remaining", "Completed"],
      getLiveValues: (ctx) => {
        const nodes = flattenGoalNodes(calculateGoalTree(ctx.goalTree));
        const completed = nodes.filter((node) => node.progress >= 100 || node.status === "completed").length;
        return { values: [Math.max(0, nodes.length - completed), completed], labels: ["Remaining", "Completed"] };
      },
    }),
  },
  {
    id: "charts-distribution",
    title: "Distribution",
    description: "Share of total XP contributed by each attribute.",
    category: "Charts",
    icon: "DI",
    defaultSize: "lg",
    allowedSizes: allSizes,
    supportedPages: dashboardAndGoalPages,
    readOnly: true,
    searchKeywords: ["distribution", "chart"],
    component: progressListWidget({
      eyebrow: "Charts",
      title: "Distribution",
      previewItems: [
        { id: "p-di-1", title: "Trading", subtitle: "1,240 XP", progress: 40 },
        { id: "p-di-2", title: "Discipline", subtitle: "1,860 XP", progress: 60 },
      ],
      getLiveItems: (ctx) => {
        const total = Math.max(1, ctx.progressionSummary.categoryProgression.reduce((sum, category) => sum + category.xp, 0));
        return ctx.progressionSummary.categoryProgression.map((category) => ({ id: category.id, title: category.name, subtitle: `${category.xp.toLocaleString()} XP`, progress: Math.round((category.xp / total) * 100) }));
      },
      emptyText: "No attribute XP yet.",
    }),
  },
];

// ---------------------------------------------------------------------------
// Legacy attribute-specific widgets. Scoped to the exact original attribute id
// for continuity with users migrated from the pre-dynamic-attribute system.
// Not shown for user-created attributes.
// ---------------------------------------------------------------------------

function legacyKeywordWidget(options: {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  attributeId: string;
  keywords: ReadonlyArray<string>;
  previewItems: ReadonlyArray<MiniProgressItem>;
}): CatalogWidgetDefinition {
  return {
    id: options.id,
    title: options.title,
    description: options.description,
    category: options.category,
    icon: options.icon,
    defaultSize: "lg",
    allowedSizes: allSizes,
    supportedPages: ["dashboard", options.attributeId],
    readOnly: true,
    searchKeywords: [options.title.toLowerCase(), ...options.keywords],
    component: progressListWidget({
      eyebrow: options.category,
      title: options.title,
      previewItems: options.previewItems,
      getLiveItems: (ctx) =>
        getAttributePortfolio(ctx.goalTree, ctx.questDefinitions, options.attributeId)
          .progressGoals.filter((node) => keywordMatch(node.title, options.keywords) || keywordMatch(node.description, options.keywords))
          .map(toMiniItem),
      emptyText: `No ${options.title.toLowerCase()} data yet.`,
    }),
  };
}

function legacyXpWidget(options: { id: string; title: string; category: string; icon: string; attributeId: string }): CatalogWidgetDefinition {
  return {
    id: options.id,
    title: options.title,
    description: `${options.category} attribute XP and level.`,
    category: options.category,
    icon: options.icon,
    defaultSize: "md",
    allowedSizes: allSizes,
    supportedPages: ["dashboard", options.attributeId],
    readOnly: true,
    searchKeywords: [options.title.toLowerCase(), "xp", "level"],
    component: function Component({ mode }: CatalogWidgetComponentProps) {
      const ctx = useWidgetLiveContext();

      if (mode === "preview") {
        return (
          <WidgetShell eyebrow={options.category} title={options.title}>
            <StatValue label="Level 3" value="1,240 XP" />
          </WidgetShell>
        );
      }

      const category = ctx.progressionSummary.categoryProgression.find((item) => item.id === options.attributeId);

      return (
        <WidgetShell eyebrow={options.category} title={options.title}>
          {category ? <StatValue label={`Level ${category.level}`} value={`${category.xp.toLocaleString()} XP`} /> : <EmptyWidgetState />}
        </WidgetShell>
      );
    },
  };
}

function legacyComingSoonWidget(options: { id: string; title: string; description: string; category: string; icon: string; attributeId: string; previewNode: React.ReactNode }): CatalogWidgetDefinition {
  return {
    id: options.id,
    title: options.title,
    description: options.description,
    category: options.category,
    icon: options.icon,
    defaultSize: "md",
    allowedSizes: allSizes,
    supportedPages: ["dashboard", options.attributeId],
    readOnly: true,
    searchKeywords: [options.title.toLowerCase()],
    component: comingSoonWidget({ eyebrow: options.category, title: options.title, description: options.description, previewNode: options.previewNode }),
  };
}

const legacyWidgets: CatalogWidgetDefinition[] = [
  legacyKeywordWidget({ id: "trading-backtest-progress", title: "Backtest Progress", description: "Progress goals related to backtesting.", category: "Trading", icon: "BP", attributeId: "trading", keywords: ["backtest", "backtesting"], previewItems: [{ id: "p-bt-1", title: "100 backtests logged", subtitle: "progress goal", progress: 72 }] }),
  legacyXpWidget({ id: "trading-xp", title: "Trading XP", category: "Trading", icon: "TX", attributeId: "trading" }),
  legacyKeywordWidget({ id: "trading-strategy-completion", title: "Strategy Completion", description: "Strategy-related goals and progress.", category: "Trading", icon: "SC", attributeId: "trading", keywords: ["strategy", "model", "setup"], previewItems: [{ id: "p-sc-1", title: "Finalize breakout model", subtitle: "goal", progress: 55 }] }),
  legacyComingSoonWidget({ id: "trading-win-rate", title: "Win Rate", description: "Win rate tracking is not connected yet.", category: "Trading", icon: "WR", attributeId: "trading", previewNode: <StatValue label="Win Rate" value="64.2%" /> }),
  legacyComingSoonWidget({ id: "trading-rr-distribution", title: "RR Distribution", description: "Risk/reward tracking is not connected yet.", category: "Trading", icon: "RR", attributeId: "trading", previewNode: <MiniBars values={[3, 8, 12, 6, 2]} labels={["<1R", "1-2R", "2-3R", "3-4R", "4R+"]} /> }),
  legacyKeywordWidget({ id: "trading-consistency", title: "Consistency", description: "Trading quest completion from history.", category: "Trading", icon: "CN", attributeId: "trading", keywords: ["trading", "trade", "backtest"], previewItems: [{ id: "p-cn-1", title: "Journal every trade", subtitle: "streak", progress: 80 }] }),
  legacyComingSoonWidget({ id: "trading-pairs-traded", title: "Pairs Traded", description: "Pair tracking is not connected yet.", category: "Trading", icon: "PT", attributeId: "trading", previewNode: <StatValue label="Pairs" value={4} /> }),

  legacyKeywordWidget({ id: "career-current-projects", title: "Current Projects", description: "Active career-related goals.", category: "Career", icon: "CP", attributeId: "career", keywords: ["project"], previewItems: [{ id: "p-cp-1", title: "Ship v2 of the platform", subtitle: "goal", progress: 60 }] }),
  legacyComingSoonWidget({ id: "career-applications", title: "Applications", description: "Application tracking is not connected yet.", category: "Career", icon: "AP", attributeId: "career", previewNode: <StatValue label="Sent" value={6} /> }),
  legacyKeywordWidget({ id: "career-study-progress", title: "Study Progress", description: "Study-related goals and progress.", category: "Career", icon: "SP", attributeId: "career", keywords: ["study"], previewItems: [{ id: "p-sp-1", title: "Finish certification", subtitle: "goal", progress: 40 }] }),
  legacyKeywordWidget({ id: "career-thesis-progress", title: "Thesis Progress", description: "Thesis-related goals and progress.", category: "Career", icon: "TP2", attributeId: "career", keywords: ["thesis", "research"], previewItems: [{ id: "p-th-1", title: "Finish literature review", subtitle: "goal", progress: 33 }] }),
  legacyXpWidget({ id: "career-xp", title: "Career XP", category: "Career", icon: "CX", attributeId: "career" }),

  legacyKeywordWidget({ id: "health-weight-progress", title: "Weight Progress", description: "Weight goal or milestone progress.", category: "Physical Health", icon: "WT", attributeId: "physical-health", keywords: ["weight", "kg"], previewItems: [{ id: "p-wt-1", title: "Reach target weight", subtitle: "progress goal", progress: 58 }] }),
  legacyKeywordWidget({ id: "health-body-fat-progress", title: "Body Fat Progress", description: "Body fat goal or milestone progress.", category: "Physical Health", icon: "BF", attributeId: "physical-health", keywords: ["body fat", "fat"], previewItems: [{ id: "p-bf-1", title: "Reach target body fat %", subtitle: "progress goal", progress: 45 }] }),
  legacyKeywordWidget({ id: "health-strength", title: "Strength", description: "Strength-related progress goals.", category: "Physical Health", icon: "ST", attributeId: "physical-health", keywords: ["strength", "lift", "pull", "push"], previewItems: [{ id: "p-st-1", title: "Bodyweight pull-up x10", subtitle: "progress goal", progress: 70 }] }),
  legacyKeywordWidget({ id: "health-endurance", title: "Endurance", description: "Running or endurance progress goals.", category: "Physical Health", icon: "EN", attributeId: "physical-health", keywords: ["run", "running", "endurance", "cardio"], previewItems: [{ id: "p-en-1", title: "Run a half marathon", subtitle: "progress goal", progress: 30 }] }),
  legacyKeywordWidget({ id: "health-workout-completion", title: "Workout Completion", description: "Workout quest completion from activity.", category: "Physical Health", icon: "WC", attributeId: "physical-health", keywords: ["workout", "training"], previewItems: [{ id: "p-wc-1", title: "Train legs", subtitle: "quest streak", progress: 90 }] }),
  legacyKeywordWidget({ id: "health-running-progress", title: "Running Progress", description: "Running-related goals and progress.", category: "Physical Health", icon: "RP", attributeId: "physical-health", keywords: ["run", "running"], previewItems: [{ id: "p-rp2-1", title: "Run a half marathon", subtitle: "progress goal", progress: 30 }] }),
  legacyComingSoonWidget({ id: "health-calories", title: "Calories", description: "Calorie tracking is not connected yet.", category: "Physical Health", icon: "CA", attributeId: "physical-health", previewNode: <StatValue label="Today" value="2,140 kcal" /> }),
  legacyXpWidget({ id: "physical-health-xp", title: "Physical Health XP", category: "Physical Health", icon: "PX", attributeId: "physical-health" }),

  legacyKeywordWidget({ id: "self-dev-reading-progress", title: "Reading Progress", description: "Reading-related goals and progress.", category: "Self Development", icon: "RD3", attributeId: "self-development", keywords: ["reading", "read", "book", "pages"], previewItems: [{ id: "p-rd2-1", title: "Read 20 pages daily", subtitle: "quest streak", progress: 85 }] }),
  legacyKeywordWidget({ id: "self-dev-italian-progress", title: "Italian Progress", description: "Language-learning goals and progress.", category: "Self Development", icon: "IT", attributeId: "self-development", keywords: ["italian", "language"], previewItems: [{ id: "p-it-1", title: "Reach B1 Italian", subtitle: "goal", progress: 45 }] }),
  legacyComingSoonWidget({ id: "self-dev-learning-time", title: "Learning Time", description: "Learning time tracking is not connected yet.", category: "Self Development", icon: "LT", attributeId: "self-development", previewNode: <StatValue label="This Week" value="4h 30m" /> }),
  legacyComingSoonWidget({ id: "self-dev-books-completed", title: "Books Completed", description: "Book tracking is not connected yet.", category: "Self Development", icon: "BK", attributeId: "self-development", previewNode: <StatValue label="This Year" value={7} /> }),
  legacyComingSoonWidget({ id: "self-dev-reflection-count", title: "Reflection Count", description: "Reflection tracking is not connected yet.", category: "Self Development", icon: "RF", attributeId: "self-development", previewNode: <StatValue label="This Month" value={12} /> }),
  legacyXpWidget({ id: "self-development-xp", title: "Self-Development XP", category: "Self Development", icon: "SX", attributeId: "self-development" }),
];

export const catalogWidgets: CatalogWidgetDefinition[] = [...staticWidgets, ...legacyWidgets];

export const catalogCategories: string[] = Array.from(new Set(catalogWidgets.map((widget) => widget.category)));

export function getCatalogWidget(id: string) {
  return catalogWidgets.find((widget) => widget.id === id) ?? null;
}

function isAttributeishPage(pageId: string) {
  return pageId !== "dashboard" && pageId !== "goal-tree" && pageId !== "quests";
}

/**
 * Builds a few widgets scoped to whichever specific attribute page is being
 * viewed, using the same generic portfolio/activity helpers the legacy
 * attribute widgets use - just parameterized by the real dynamic attribute id
 * instead of a hardcoded one.
 */
function getAttributeScopedWidgets(attributeId: string): CatalogWidgetDefinition[] {
  return [
    {
      id: `attribute-${attributeId}-dreams`,
      title: "This Attribute's Dreams",
      description: "Dreams that draw on this attribute.",
      category: "Attributes",
      icon: "AD2",
      defaultSize: "lg",
      allowedSizes: allSizes,
      supportedPages: [attributeId],
      readOnly: true,
      searchKeywords: ["dreams", "attribute"],
      component: progressListWidget({
        eyebrow: "Attributes",
        title: "This Attribute's Dreams",
        previewItems: previewDreams,
        getLiveItems: (ctx) => getAttributePortfolio(ctx.goalTree, ctx.questDefinitions, attributeId).dreams.map(toMiniItem),
        emptyText: "No dreams tied to this attribute yet.",
      }),
    },
    {
      id: `attribute-${attributeId}-quests`,
      title: "This Attribute's Quests",
      description: "Quests linked to goals under this attribute.",
      category: "Attributes",
      icon: "AQ",
      defaultSize: "lg",
      allowedSizes: allSizes,
      supportedPages: [attributeId],
      readOnly: true,
      searchKeywords: ["quests", "attribute"],
      component: progressListWidget({
        eyebrow: "Attributes",
        title: "This Attribute's Quests",
        previewItems: previewQuests,
        getLiveItems: (ctx) => getAttributePortfolio(ctx.goalTree, ctx.questDefinitions, attributeId).quests.map((quest) => ({ id: quest.id, title: quest.title, subtitle: quest.description ?? "Quest", progress: 0 })),
        emptyText: "No quests linked to this attribute yet.",
      }),
    },
  ];
}

/**
 * Widget list available for a given page (used to populate the catalog and to
 * validate "already added" state). `pageId` is either "dashboard", "goal-tree",
 * or an attribute id (e.g. "trading" or a user-generated custom attribute id).
 */
export function getCatalogWidgetsForPage(pageId: string): CatalogWidgetDefinition[] {
  const scoped = isAttributeishPage(pageId) ? getAttributeScopedWidgets(pageId) : [];

  const base = catalogWidgets.filter((widget) => widget.supportedPages.includes(pageId as CatalogSupportedPage) || (isAttributeishPage(pageId) && widget.supportedPages.includes("attributes")));

  return [...base, ...scoped];
}
