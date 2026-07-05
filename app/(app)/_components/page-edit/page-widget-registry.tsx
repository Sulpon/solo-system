"use client";

import Link from "next/link";
import Card from "../Card";
import Progress from "../Progress";
import { categories } from "../../_lib/mock/categories";
import { getAttributePortfolio } from "../../_lib/attribute-portfolio";
import { getEventsByAttribute, getEventsByType, getTodayEvents, getWeekEvents } from "../../_lib/activity-events";
import { getBonusQuests, getCoreQuests, getTodayQuests } from "../../_lib/daily-system";
import { calculateGoalTree, summarizeGoalTree, type GoalNodeView } from "../../_lib/goal-tree-progress";
import { getLocalDayKey } from "../../_lib/local-day";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { useProgression } from "../../_lib/hooks/useProgression";
import type { ActivityEvent } from "../../_lib/types/activity-event";
import type { CategoryId } from "../../_lib/types/category";
import type { GoalTree } from "../../_lib/types/goal-tree";
import type { Quest } from "../../_lib/types/quest";
import type { EditablePageSection, PageSectionSize } from "./types";

type PageWidgetPageId = "dashboard" | "goal-tree" | "quests" | "trading" | "career" | "physical-health" | "self-development" | "discipline" | "attributes";

type PageWidgetCategory = "General" | "Quests" | "Attributes" | "Trading" | "Physical Health" | "Career" | "Self-Development" | "Goal Tree";

type PageWidgetDefinition = Readonly<{
  id: string;
  title: string;
  description: string;
  category: PageWidgetCategory;
  allowedPages: ReadonlyArray<PageWidgetPageId>;
  defaultSize: PageSectionSize;
  render: () => React.ReactNode;
}>;

const allPages: PageWidgetPageId[] = ["dashboard", "goal-tree", "quests", "trading", "career", "physical-health", "self-development", "discipline", "attributes"];
const attributePages: PageWidgetPageId[] = ["dashboard", "attributes", "trading", "career", "physical-health", "self-development", "discipline"];
const goalPages: PageWidgetPageId[] = ["dashboard", "goal-tree"];

function WidgetShell({
  eyebrow,
  title,
  children,
  actionHref,
}: Readonly<{
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  actionHref?: string;
}>) {
  return (
    <Card className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-black text-white">{title}</h2>
        </div>
        {actionHref ? (
          <Link href={actionHref} className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-purple-400/60 hover:text-white">
            Open
          </Link>
        ) : null}
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function EmptyWidgetState({ text = "No data yet. Complete quests to generate stats." }: Readonly<{ text?: string }>) {
  return <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-5 text-sm text-slate-400">{text}</div>;
}

function StatValue({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{typeof value === "number" ? value.toLocaleString() : value}</p>
    </div>
  );
}

function MiniProgressList({ items, emptyText }: Readonly<{ items: ReadonlyArray<{ id: string; title: string; subtitle?: string; progress: number }>; emptyText?: string }>) {
  if (items.length === 0) {
    return <EmptyWidgetState text={emptyText} />;
  }

  return (
    <div className="space-y-3">
      {items.slice(0, 6).map((item) => (
        <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{item.title}</p>
              {item.subtitle ? <p className="mt-1 text-xs text-slate-500">{item.subtitle}</p> : null}
            </div>
            <span className="shrink-0 text-sm font-semibold text-cyan-200">{item.progress}%</span>
          </div>
          <Progress value={item.progress} max={100} className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950/80" fillClassName="h-full bg-gradient-to-r from-purple-500 to-cyan-300" />
        </div>
      ))}
    </div>
  );
}

function MiniActivityFeed({ events, emptyText }: Readonly<{ events: ReadonlyArray<ActivityEvent>; emptyText?: string }>) {
  if (events.length === 0) {
    return <EmptyWidgetState text={emptyText} />;
  }

  return (
    <div className="space-y-3">
      {events.slice(0, 6).map((event) => (
        <div key={event.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="truncate font-semibold text-white">{event.title}</p>
          <p className="mt-1 text-xs text-slate-500">{event.description ?? event.type.replaceAll("_", " ")}</p>
        </div>
      ))}
    </div>
  );
}

function flatten(nodes: ReadonlyArray<GoalNodeView>): GoalNodeView[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

function keywordMatch(value: string | undefined, keywords: ReadonlyArray<string>) {
  const normalized = (value ?? "").toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function getKeywordGoalItems(goalTree: GoalTree, keywords: ReadonlyArray<string>) {
  return flatten(calculateGoalTree(goalTree))
    .filter((node) => keywordMatch(node.title, keywords) || keywordMatch(node.description, keywords))
    .sort((first, second) => second.progress - first.progress);
}

function GeneralDreamProgressWidget() {
  const { goalTree } = useGoalTree();
  const dreams = calculateGoalTree(goalTree).map((dream) => ({ id: dream.id, title: dream.title, subtitle: dream.description ?? "Dream", progress: dream.progress }));
  return <WidgetShell eyebrow="General" title="Dream Progress" actionHref="/goals"><MiniProgressList items={dreams} emptyText="Create dreams in Goal Tree to see progress here." /></WidgetShell>;
}

function GeneralGoalProgressWidget() {
  const { goalTree } = useGoalTree();
  const goals = flatten(calculateGoalTree(goalTree)).filter((node) => node.type === "long_term_goal" && node.status !== "completed").map((node) => ({ id: node.id, title: node.title, subtitle: node.description ?? "Goal", progress: node.progress }));
  return <WidgetShell eyebrow="General" title="Goal Progress" actionHref="/goals"><MiniProgressList items={goals} emptyText="Active goals will appear here." /></WidgetShell>;
}

function ProgressGoalsNearCompletionWidget({ categoryId }: Readonly<{ categoryId?: CategoryId }>) {
  const { goalTree } = useGoalTree();
  const { questDefinitions } = useProgression();
  const source = categoryId ? getAttributePortfolio(goalTree, questDefinitions, categoryId).progressGoals : flatten(calculateGoalTree(goalTree)).filter((node) => node.type === "progress_goal");
  const goals = source.filter((node) => node.progress >= 70 && node.progress < 100).map((node) => ({ id: node.id, title: node.title, subtitle: node.unit ? `${node.currentValue ?? 0} / ${node.targetValue ?? 0} ${node.unit}` : node.description ?? "Progress goal", progress: node.progress }));
  return <WidgetShell eyebrow="Progress" title="Progress Goals Near Completion" actionHref="/goals"><MiniProgressList items={goals} emptyText="No progress goals near completion yet." /></WidgetShell>;
}

function OverallCompletionWidget() {
  const { goalTree } = useGoalTree();
  const summary = summarizeGoalTree(goalTree);
  return <WidgetShell eyebrow="General" title="Overall Completion"><div className="grid gap-3 sm:grid-cols-3"><StatValue label="Progress" value={`${summary.progress}%`} /><StatValue label="Completed" value={summary.completedChildrenCount} /><StatValue label="Total" value={summary.directChildrenCount} /></div></WidgetShell>;
}

function ActivityFeedWidget({ categoryId }: Readonly<{ categoryId?: CategoryId }>) {
  const { activityEvents } = useProgression();
  const events = categoryId ? activityEvents.filter((event) => event.metadata.attributeId === categoryId || event.metadata.categoryId === categoryId) : activityEvents;
  return <WidgetShell eyebrow="Activity" title="Activity Feed"><MiniActivityFeed events={events} /></WidgetShell>;
}

function ConsistencyScoreWidget() {
  const { dailySnapshots } = useProgression();
  const score = dailySnapshots.length === 0 ? null : Math.round(dailySnapshots.reduce((total, snapshot) => total + snapshot.dailySuccessPercent, 0) / dailySnapshots.length);
  return <WidgetShell eyebrow="General" title="Consistency Score">{score === null ? <EmptyWidgetState text="Finish days to build consistency history." /> : <StatValue label="Reviewed average" value={`${score}%`} />}</WidgetShell>;
}

function TomorrowPreviewWidget() {
  const { questDefinitions } = useProgression();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const coreQuests = getCoreQuests(getTodayQuests(questDefinitions, tomorrow));
  const xp = coreQuests.reduce((total, quest) => total + quest.xp, 0);
  return <WidgetShell eyebrow="General" title="Tomorrow Preview"><div className="grid gap-3 sm:grid-cols-2"><StatValue label="Core quests" value={coreQuests.length} /><StatValue label="Available XP" value={xp} /></div></WidgetShell>;
}

function XpTotalWidget({ range }: Readonly<{ range: "today" | "week" }>) {
  const { activityEvents, progressionSummary } = useProgression();
  const events = range === "today" ? getTodayEvents(activityEvents) : getWeekEvents(activityEvents);
  const xp = events.reduce((total, event) => total + (typeof event.metadata.xp === "number" ? event.metadata.xp : 0), 0);
  return <WidgetShell eyebrow="XP" title={range === "today" ? "XP Today" : "XP This Week"}><StatValue label="Activity XP" value={xp || (range === "today" ? progressionSummary.dailyXP : progressionSummary.weeklyXP)} /></WidgetShell>;
}

function XpSourcesWidget() {
  const { activityEvents } = useProgression();
  const sources = ["quest", "goal", "milestone", "dream", "progress_goal"].map((source) => ({
    source,
    xp: activityEvents.filter((event) => event.metadata.sourceType === source || event.sourceType === source).reduce((total, event) => total + (typeof event.metadata.xp === "number" ? event.metadata.xp : 0), 0),
  }));
  return <WidgetShell eyebrow="XP" title="XP Sources"><div className="grid gap-3 sm:grid-cols-2">{sources.map((item) => <StatValue key={item.source} label={item.source.replace("_", " ")} value={item.xp} />)}</div></WidgetShell>;
}

function QuestSummaryWidget({ importance }: Readonly<{ importance: "core" | "bonus" }>) {
  const { questDefinitions, questCompletions } = useProgression();
  const quests = (importance === "core" ? getCoreQuests(getTodayQuests(questDefinitions)) : getBonusQuests(getTodayQuests(questDefinitions)));
  const today = getLocalDayKey();
  const completed = quests.filter((quest) => questCompletions.some((completion) => completion.questId === quest.id && getLocalDayKey(completion.completedAt) === today)).length;
  return <WidgetShell eyebrow="Quests" title={importance === "core" ? "Today's Core Quests Summary" : "Today's Bonus Missions Summary"}><div className="grid gap-3 sm:grid-cols-2"><StatValue label="Scheduled" value={quests.length} /><StatValue label="Completed" value={completed} /></div></WidgetShell>;
}

function QuestCompletionRateWidget() {
  const { questCompletions, questDefinitions } = useProgression();
  const activeQuestCount = questDefinitions.filter((quest) => quest.status === "active").length;
  const rate = activeQuestCount === 0 ? 0 : Math.min(100, Math.round((questCompletions.length / Math.max(1, activeQuestCount * 7)) * 100));
  return <WidgetShell eyebrow="Quests" title="Quest Completion Rate">{questCompletions.length === 0 ? <EmptyWidgetState /> : <StatValue label="Recent rate" value={`${rate}%`} />}</WidgetShell>;
}

function QuestXpEarnedWidget() {
  const { activityEvents } = useProgression();
  const xp = getEventsByType(activityEvents, "quest_xp_awarded").reduce((total, event) => total + (typeof event.metadata.xp === "number" ? event.metadata.xp : 0), 0);
  return <WidgetShell eyebrow="Quests" title="Quest XP Earned"><StatValue label="Quest XP" value={xp} /></WidgetShell>;
}

function ActiveQuestCountWidget({ importance }: Readonly<{ importance: "core" | "bonus" }>) {
  const { questDefinitions } = useProgression();
  const quests = getTodayQuests(questDefinitions).filter((quest) => (quest.importance ?? "core") === importance);
  return <WidgetShell eyebrow="Quests" title={importance === "core" ? "Active Core Quest Count" : "Active Bonus Quest Count"}><StatValue label="Today" value={quests.length} /></WidgetShell>;
}

function MostSkippedQuestsWidget() {
  return <WidgetShell eyebrow="Quests" title="Most Skipped Quests"><EmptyWidgetState text="Skipped quest analytics will appear after skip/absence history exists." /></WidgetShell>;
}

function AttributeLevelsWidget() {
  const { progressionSummary } = useProgression();
  return <WidgetShell eyebrow="Attributes" title="Attribute Levels"><MiniProgressList items={progressionSummary.categoryProgression.map((category) => ({ id: category.id, title: category.name, subtitle: `Level ${category.level} · ${category.xp.toLocaleString()} XP`, progress: category.progress }))} /></WidgetShell>;
}

function AttributeXpWidget({ range }: Readonly<{ range: "today" | "week" }>) {
  const { activityEvents } = useProgression();
  const events = range === "today" ? getTodayEvents(activityEvents) : getWeekEvents(activityEvents);
  const items = categories.map((category) => ({
    id: category.id,
    title: category.name,
    value: events.filter((event) => event.metadata.attributeId === category.id).reduce((total, event) => total + (typeof event.metadata.xp === "number" ? event.metadata.xp : 0), 0),
  }));
  return <WidgetShell eyebrow="Attributes" title={range === "today" ? "Attribute XP Today" : "Attribute XP This Week"}><div className="grid gap-3 sm:grid-cols-2">{items.map((item) => <StatValue key={item.id} label={item.title} value={item.value} />)}</div></WidgetShell>;
}

function AttributeBalanceWidget() {
  const { progressionSummary } = useProgression();
  const total = Math.max(1, progressionSummary.categoryProgression.reduce((sum, category) => sum + category.xp, 0));
  return <WidgetShell eyebrow="Attributes" title="Attribute Balance"><MiniProgressList items={progressionSummary.categoryProgression.map((category) => ({ id: category.id, title: category.name, subtitle: `${category.xp.toLocaleString()} XP`, progress: Math.round((category.xp / total) * 100) }))} /></WidgetShell>;
}

function RecentAttributeActivityWidget() {
  const { activityEvents } = useProgression();
  return <WidgetShell eyebrow="Attributes" title="Recent Attribute Activity"><MiniActivityFeed events={activityEvents.filter((event) => event.type === "attribute_xp_awarded")} /></WidgetShell>;
}

function TopGrowingAttributeWidget() {
  const { activityEvents } = useProgression();
  const weekEvents = getWeekEvents(activityEvents);
  const gains = categories.map((category) => ({
    category,
    xp: weekEvents.filter((event) => event.metadata.attributeId === category.id).reduce((total, event) => total + (typeof event.metadata.xp === "number" ? event.metadata.xp : 0), 0),
  })).sort((first, second) => second.xp - first.xp);
  const top = gains[0];
  return <WidgetShell eyebrow="Attributes" title="Top Growing Attribute">{top && top.xp > 0 ? <StatValue label={top.category.name} value={`+${top.xp.toLocaleString()} XP`} /> : <EmptyWidgetState text="No attribute XP gained this week yet." />}</WidgetShell>;
}

function AttributeXpStatusWidget({ categoryId, title }: Readonly<{ categoryId: CategoryId; title: string }>) {
  const { progressionSummary } = useProgression();
  const category = progressionSummary.categoryProgression.find((item) => item.id === categoryId);
  return <WidgetShell eyebrow="Attribute XP" title={title}>{category ? <MiniProgressList items={[{ id: category.id, title: category.name, subtitle: `Level ${category.level} · ${category.xp.toLocaleString()} XP`, progress: category.progress }]} /> : <EmptyWidgetState />}</WidgetShell>;
}

function KeywordProgressWidget({ title, keywords, categoryId }: Readonly<{ title: string; keywords: ReadonlyArray<string>; categoryId?: CategoryId }>) {
  const { goalTree } = useGoalTree();
  const { questDefinitions } = useProgression();
  const items = categoryId
    ? getAttributePortfolio(goalTree, questDefinitions, categoryId).progressGoals.filter((node) => keywordMatch(node.title, keywords) || keywordMatch(node.description, keywords))
    : getKeywordGoalItems(goalTree, keywords);
  return <WidgetShell eyebrow="Progress" title={title} actionHref="/goals"><MiniProgressList items={items.map((node) => ({ id: node.id, title: node.title, subtitle: node.description ?? node.type.replaceAll("_", " "), progress: node.progress }))} emptyText={`No ${title.toLowerCase()} data yet.`} /></WidgetShell>;
}

function CategoryActivityWidget({ categoryId, title }: Readonly<{ categoryId: CategoryId; title: string }>) {
  const { activityEvents } = useProgression();
  return <WidgetShell eyebrow="Activity" title={title}><MiniActivityFeed events={activityEvents.filter((event) => event.metadata.attributeId === categoryId || event.metadata.categoryId === categoryId)} /></WidgetShell>;
}

function EmptyMetricWidget({ title }: Readonly<{ title: string }>) {
  return <WidgetShell eyebrow="Metric" title={title}><EmptyWidgetState text={`${title} will appear when a real data source exists.`} /></WidgetShell>;
}

const widgetDefinitions: PageWidgetDefinition[] = [
  { id: "dream-progress", title: "Dream Progress", description: "Shows all dreams with progress bars.", category: "General", allowedPages: allPages, defaultSize: "lg", render: () => <GeneralDreamProgressWidget /> },
  { id: "goal-progress", title: "Goal Progress", description: "Shows progress of top active goals.", category: "General", allowedPages: allPages, defaultSize: "lg", render: () => <GeneralGoalProgressWidget /> },
  { id: "progress-goals-near-completion", title: "Progress Goals Near Completion", description: "Progress goals close to target.", category: "General", allowedPages: [...allPages, "goal-tree"], defaultSize: "lg", render: () => <ProgressGoalsNearCompletionWidget /> },
  { id: "overall-completion", title: "Overall Completion", description: "Completed dreams, goals, milestones, and progress goals.", category: "General", allowedPages: allPages, defaultSize: "md", render: () => <OverallCompletionWidget /> },
  { id: "activity-feed", title: "Activity Feed", description: "Recent activity events.", category: "General", allowedPages: allPages, defaultSize: "lg", render: () => <ActivityFeedWidget /> },
  { id: "consistency-score", title: "Consistency Score", description: "Consistency from daily snapshots.", category: "General", allowedPages: allPages, defaultSize: "md", render: () => <ConsistencyScoreWidget /> },
  { id: "tomorrow-preview", title: "Tomorrow Preview", description: "Tomorrow's scheduled core quests and XP.", category: "General", allowedPages: allPages, defaultSize: "md", render: () => <TomorrowPreviewWidget /> },
  { id: "xp-today", title: "XP Today", description: "Total XP earned today.", category: "General", allowedPages: allPages, defaultSize: "sm", render: () => <XpTotalWidget range="today" /> },
  { id: "xp-this-week", title: "XP This Week", description: "Total XP earned this week.", category: "General", allowedPages: allPages, defaultSize: "sm", render: () => <XpTotalWidget range="week" /> },
  { id: "xp-sources", title: "XP Sources", description: "XP by source type.", category: "General", allowedPages: allPages, defaultSize: "lg", render: () => <XpSourcesWidget /> },
  { id: "core-quests-summary", title: "Today's Core Quests Summary", description: "Read-only summary of core quests for today.", category: "Quests", allowedPages: ["dashboard", "quests"], defaultSize: "md", render: () => <QuestSummaryWidget importance="core" /> },
  { id: "bonus-quests-summary", title: "Today's Bonus Missions Summary", description: "Read-only summary of bonus quests for today.", category: "Quests", allowedPages: ["dashboard", "quests"], defaultSize: "md", render: () => <QuestSummaryWidget importance="bonus" /> },
  { id: "quest-completion-rate", title: "Quest Completion Rate", description: "Completion rate over recent quest history.", category: "Quests", allowedPages: ["dashboard", "quests"], defaultSize: "md", render: () => <QuestCompletionRateWidget /> },
  { id: "most-skipped-quests", title: "Most Skipped Quests", description: "Quests with lowest completion rates when skip history exists.", category: "Quests", allowedPages: ["dashboard", "quests"], defaultSize: "md", render: () => <MostSkippedQuestsWidget /> },
  { id: "quest-xp-earned", title: "Quest XP Earned", description: "Quest XP over recorded history.", category: "Quests", allowedPages: ["dashboard", "quests"], defaultSize: "md", render: () => <QuestXpEarnedWidget /> },
  { id: "active-core-quest-count", title: "Active Core Quest Count", description: "Number of active core quests today.", category: "Quests", allowedPages: ["dashboard", "quests"], defaultSize: "sm", render: () => <ActiveQuestCountWidget importance="core" /> },
  { id: "active-bonus-quest-count", title: "Active Bonus Quest Count", description: "Number of active bonus quests today.", category: "Quests", allowedPages: ["dashboard", "quests"], defaultSize: "sm", render: () => <ActiveQuestCountWidget importance="bonus" /> },
  { id: "attribute-levels", title: "Attribute Levels", description: "All attributes with level and XP progress.", category: "Attributes", allowedPages: attributePages, defaultSize: "lg", render: () => <AttributeLevelsWidget /> },
  { id: "attribute-xp-today", title: "Attribute XP Today", description: "XP gained today by attribute.", category: "Attributes", allowedPages: attributePages, defaultSize: "lg", render: () => <AttributeXpWidget range="today" /> },
  { id: "attribute-xp-this-week", title: "Attribute XP This Week", description: "Weekly XP by attribute.", category: "Attributes", allowedPages: attributePages, defaultSize: "lg", render: () => <AttributeXpWidget range="week" /> },
  { id: "attribute-balance", title: "Attribute Balance", description: "Distribution of XP across attributes.", category: "Attributes", allowedPages: attributePages, defaultSize: "lg", render: () => <AttributeBalanceWidget /> },
  { id: "recent-attribute-activity", title: "Recent Attribute Activity", description: "Recent attribute XP events.", category: "Attributes", allowedPages: attributePages, defaultSize: "lg", render: () => <RecentAttributeActivityWidget /> },
  { id: "top-growing-attribute", title: "Top Growing Attribute", description: "Attribute with most XP gained this week.", category: "Attributes", allowedPages: attributePages, defaultSize: "md", render: () => <TopGrowingAttributeWidget /> },
  { id: "backtest-progress", title: "Backtest Progress", description: "Progress goals related to backtesting.", category: "Trading", allowedPages: ["dashboard", "trading"], defaultSize: "lg", render: () => <KeywordProgressWidget title="Backtest Progress" categoryId="trading" keywords={["backtest", "backtesting"]} /> },
  { id: "strategy-completion", title: "Strategy Completion", description: "Strategy-related goals and progress.", category: "Trading", allowedPages: ["dashboard", "trading"], defaultSize: "lg", render: () => <KeywordProgressWidget title="Strategy Completion" categoryId="trading" keywords={["strategy", "model", "setup"]} /> },
  { id: "trading-xp", title: "Trading XP", description: "Trading attribute level and XP.", category: "Trading", allowedPages: ["dashboard", "trading"], defaultSize: "md", render: () => <AttributeXpStatusWidget categoryId="trading" title="Trading XP" /> },
  { id: "trading-activity-feed", title: "Trading Activity Feed", description: "Recent trading-related activity events.", category: "Trading", allowedPages: ["dashboard", "trading"], defaultSize: "lg", render: () => <CategoryActivityWidget categoryId="trading" title="Trading Activity Feed" /> },
  { id: "trading-consistency", title: "Trading Consistency", description: "Trading quest completion from history.", category: "Trading", allowedPages: ["dashboard", "trading"], defaultSize: "md", render: () => <KeywordProgressWidget title="Trading Consistency" categoryId="trading" keywords={["trading", "trade", "backtest"]} /> },
  { id: "trading-goals-near-completion", title: "Trading Goals Near Completion", description: "Trading progress goals close to completion.", category: "Trading", allowedPages: ["dashboard", "trading"], defaultSize: "lg", render: () => <ProgressGoalsNearCompletionWidget categoryId="trading" /> },
  ...["Win Rate", "Average R", "Profit Factor", "Setup Distribution", "Pair Performance", "Monthly Trading Stats"].map((title): PageWidgetDefinition => ({ id: title.toLowerCase().replaceAll(" ", "-"), title, description: "Uses real trading data when available.", category: "Trading", allowedPages: ["dashboard", "trading"], defaultSize: "md", render: () => <EmptyMetricWidget title={title} /> })),
  { id: "weight-progress", title: "Weight Progress", description: "Weight goal or milestone progress.", category: "Physical Health", allowedPages: ["dashboard", "physical-health"], defaultSize: "lg", render: () => <KeywordProgressWidget title="Weight Progress" categoryId="physical-health" keywords={["weight", "kg"]} /> },
  { id: "body-fat-progress", title: "Body Fat Progress", description: "Body fat goal or milestone progress.", category: "Physical Health", allowedPages: ["dashboard", "physical-health"], defaultSize: "lg", render: () => <KeywordProgressWidget title="Body Fat Progress" categoryId="physical-health" keywords={["body fat", "fat"]} /> },
  { id: "physical-health-xp", title: "Physical Health XP", description: "Physical Health attribute XP and level.", category: "Physical Health", allowedPages: ["dashboard", "physical-health"], defaultSize: "md", render: () => <AttributeXpStatusWidget categoryId="physical-health" title="Physical Health XP" /> },
  { id: "workout-completion", title: "Workout Completion", description: "Workout quest completion from activity.", category: "Physical Health", allowedPages: ["dashboard", "physical-health"], defaultSize: "md", render: () => <KeywordProgressWidget title="Workout Completion" categoryId="physical-health" keywords={["workout", "training"]} /> },
  { id: "strength-progress", title: "Strength Progress", description: "Strength-related progress goals.", category: "Physical Health", allowedPages: ["dashboard", "physical-health"], defaultSize: "lg", render: () => <KeywordProgressWidget title="Strength Progress" categoryId="physical-health" keywords={["strength", "lift", "pull", "push"]} /> },
  { id: "calisthenics-skill-progress", title: "Calisthenics Skill Progress", description: "Skill goals such as muscle-up, planche, lever.", category: "Physical Health", allowedPages: ["dashboard", "physical-health"], defaultSize: "lg", render: () => <KeywordProgressWidget title="Calisthenics Skill Progress" categoryId="physical-health" keywords={["muscle-up", "planche", "lever", "calisthenics"]} /> },
  { id: "endurance-progress", title: "Endurance Progress", description: "Running or endurance progress goals.", category: "Physical Health", allowedPages: ["dashboard", "physical-health"], defaultSize: "lg", render: () => <KeywordProgressWidget title="Endurance Progress" categoryId="physical-health" keywords={["run", "running", "endurance", "cardio"]} /> },
  { id: "recovery-summary", title: "Recovery Summary", description: "Recovery or sleep data when available.", category: "Physical Health", allowedPages: ["dashboard", "physical-health"], defaultSize: "md", render: () => <KeywordProgressWidget title="Recovery Summary" categoryId="physical-health" keywords={["recovery", "sleep"]} /> },
  { id: "career-xp", title: "Career XP", description: "Career attribute XP and level.", category: "Career", allowedPages: ["dashboard", "career"], defaultSize: "md", render: () => <AttributeXpStatusWidget categoryId="career" title="Career XP" /> },
  { id: "thesis-progress", title: "Thesis Progress", description: "Thesis-related goals and progress.", category: "Career", allowedPages: ["dashboard", "career"], defaultSize: "lg", render: () => <KeywordProgressWidget title="Thesis Progress" categoryId="career" keywords={["thesis", "research"]} /> },
  ...["Study Hours", "Papers Read", "Applications Sent"].map((title): PageWidgetDefinition => ({ id: title.toLowerCase().replaceAll(" ", "-"), title, description: "Uses real career data when available.", category: "Career", allowedPages: ["dashboard", "career"], defaultSize: "md", render: () => <KeywordProgressWidget title={title} categoryId="career" keywords={title.split(" ")} /> })),
  { id: "career-activity-feed", title: "Career Activity Feed", description: "Recent career-related activity events.", category: "Career", allowedPages: ["dashboard", "career"], defaultSize: "lg", render: () => <CategoryActivityWidget categoryId="career" title="Career Activity Feed" /> },
  { id: "career-goals-near-completion", title: "Career Goals Near Completion", description: "Career progress goals near completion.", category: "Career", allowedPages: ["dashboard", "career"], defaultSize: "lg", render: () => <ProgressGoalsNearCompletionWidget categoryId="career" /> },
  { id: "self-development-xp", title: "Self-Development XP", description: "Self-Development attribute XP and level.", category: "Self-Development", allowedPages: ["dashboard", "self-development"], defaultSize: "md", render: () => <AttributeXpStatusWidget categoryId="self-development" title="Self-Development XP" /> },
  { id: "reading-progress", title: "Reading Progress", description: "Reading-related goals and progress.", category: "Self-Development", allowedPages: ["dashboard", "self-development"], defaultSize: "lg", render: () => <KeywordProgressWidget title="Reading Progress" categoryId="self-development" keywords={["reading", "read", "book", "pages"]} /> },
  { id: "italian-progress", title: "Italian Progress", description: "Italian-related goals and progress.", category: "Self-Development", allowedPages: ["dashboard", "self-development"], defaultSize: "lg", render: () => <KeywordProgressWidget title="Italian Progress" categoryId="self-development" keywords={["italian", "language"]} /> },
  { id: "reflection-count", title: "Reflection Count", description: "Reflection data when available.", category: "Self-Development", allowedPages: ["dashboard", "self-development"], defaultSize: "md", render: () => <EmptyMetricWidget title="Reflection Count" /> },
  { id: "learning-hours", title: "Learning Hours", description: "Learning hour data when available.", category: "Self-Development", allowedPages: ["dashboard", "self-development"], defaultSize: "md", render: () => <EmptyMetricWidget title="Learning Hours" /> },
  { id: "communication-humor-progress", title: "Communication / Humor Progress", description: "Related communication and humor goals.", category: "Self-Development", allowedPages: ["dashboard", "self-development"], defaultSize: "lg", render: () => <KeywordProgressWidget title="Communication / Humor Progress" categoryId="self-development" keywords={["communication", "humor", "speaking"]} /> },
  { id: "self-development-activity-feed", title: "Self-Development Activity Feed", description: "Recent self-development activity events.", category: "Self-Development", allowedPages: ["dashboard", "self-development"], defaultSize: "lg", render: () => <CategoryActivityWidget categoryId="self-development" title="Self-Development Activity Feed" /> },
];

function toPageId(pageId: string): PageWidgetPageId {
  if (pageId === "physical-health" || pageId === "self-development" || pageId === "goal-tree") {
    return pageId;
  }

  if (pageId === "dashboard" || pageId === "quests" || pageId === "trading" || pageId === "career" || pageId === "discipline" || pageId === "attributes") {
    return pageId;
  }

  return "attributes";
}

export function getPageWidgetSections(pageId: string): EditablePageSection[] {
  const normalizedPageId = toPageId(pageId);

  return widgetDefinitions
    .filter((definition) => definition.allowedPages.includes(normalizedPageId))
    .map((definition) => ({
      id: "analytics-" + definition.id,
      title: definition.title,
      description: `${definition.category}: ${definition.description}`,
      size: definition.defaultSize,
      readOnly: true,
      content: definition.render(),
    }));
}

export const pageWidgetRegistry = widgetDefinitions;
