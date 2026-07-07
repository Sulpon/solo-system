"use client";

import ChartWidget from "../../_components/dashboard/ChartWidget";
import {
  MiniActivityFeed,
  MiniBars,
  MiniChecklist,
  MiniProgressList,
  StatValue,
  WidgetShell,
} from "./catalog-helpers";
import type { ActivityEvent } from "../types/activity-event";
import type { CatalogWidgetDefinition, CatalogWidgetSize } from "./catalog-types";

// Dashboard's own built-in widgets (Character, Daily Quests, Chart, the
// Today set, etc.) are not read-only stat widgets - several of them
// drive real interactions (completing quests, finishing the day). They stay
// on the original Dashboard widget system (app/(app)/_lib/widgets/widget-registry.tsx)
// and are rendered live through DashboardWidgetRenderer exactly as before.
//
// These entries exist ONLY so the unified Widget Catalog can show a real
// visual preview for them too (fixing the old text-only "Widget Library").
// Their ids intentionally match the original registry's ids: when one of
// these is actually placed, DashboardWidgetRenderer looks it up in the
// original registry FIRST and renders the real, fully-interactive component -
// this catalog entry's "component" is only ever invoked in mode="preview"
// inside the catalog modal.

const allSizes: CatalogWidgetSize[] = ["sm", "md", "lg", "xl"];

function previewEvent(id: string, title: string, description: string): ActivityEvent {
  return { id, type: "quest_completed", createdAt: new Date().toISOString(), title, description, sourceType: "quest", sourceId: id, metadata: {} };
}

function nativePreview(options: {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  defaultSize: CatalogWidgetSize;
  searchKeywords: ReadonlyArray<string>;
  preview: React.ReactNode;
}): CatalogWidgetDefinition {
  return {
    id: options.id,
    title: options.title,
    description: options.description,
    category: options.category,
    icon: options.icon,
    defaultSize: options.defaultSize,
    allowedSizes: allSizes,
    supportedPages: ["dashboard"],
    readOnly: true,
    searchKeywords: options.searchKeywords,
    // Always renders the sample preview: this entry is never used for live
    // rendering (see note above), so there is no live branch to maintain.
    component: () => options.preview,
  };
}

export const dashboardNativeCatalogWidgets: CatalogWidgetDefinition[] = [
  nativePreview({
    id: "character",
    title: "Character",
    description: "Live character status, level, streak, rank, and XP.",
    category: "Character",
    icon: "CH",
    defaultSize: "lg",
    searchKeywords: ["character", "level", "rank", "streak"],
    preview: (
      <WidgetShell eyebrow="Character" title="Character Status">
        <div className="grid grid-cols-3 gap-2">
          <StatValue label="Level" value={4} />
          <StatValue label="Rank" value="A" />
          <StatValue label="Streak" value={5} />
        </div>
      </WidgetShell>
    ),
  }),
  nativePreview({
    id: "daily-quests",
    title: "Daily Quests",
    description: "The active daily checklist with XP and completion state.",
    category: "Quests",
    icon: "DQ",
    defaultSize: "lg",
    searchKeywords: ["daily", "quests", "checklist"],
    preview: (
      <WidgetShell eyebrow="Quests" title="Daily Quests">
        <MiniChecklist
          items={[
            { id: "p-dq-1", title: "Journal every trade", xp: 25, completed: true },
            { id: "p-dq-2", title: "Train legs", xp: 30, completed: false },
            { id: "p-dq-3", title: "Read 20 pages", xp: 15, completed: false },
          ]}
        />
      </WidgetShell>
    ),
  }),
  nativePreview({
    id: "main-quest",
    title: "Main Quest",
    description: "The core objective that drives progression forward.",
    category: "Quests",
    icon: "MQ",
    defaultSize: "md",
    searchKeywords: ["main quest", "objective"],
    preview: (
      <WidgetShell eyebrow="Quests" title="Main Quest">
        <MiniProgressList items={[{ id: "p-mq-1", title: "Reach Level 10", subtitle: "3 objectives", progress: 62 }]} />
      </WidgetShell>
    ),
  }),
  nativePreview({
    id: "category-levels",
    title: "Attributes / Category Levels",
    description: "Category progression panels across your attributes.",
    category: "Statistics",
    icon: "CL",
    defaultSize: "lg",
    searchKeywords: ["category", "levels", "attributes"],
    preview: (
      <WidgetShell eyebrow="Statistics" title="Attributes / Category Levels">
        <MiniProgressList
          items={[
            { id: "p-cl-1", title: "Trading", subtitle: "Level 3", progress: 64 },
            { id: "p-cl-2", title: "Discipline", subtitle: "Level 4", progress: 48 },
          ]}
        />
      </WidgetShell>
    ),
  }),
  nativePreview({
    id: "achievement",
    title: "Recent Achievement",
    description: "Recent milestone and its XP reward.",
    category: "Statistics",
    icon: "AC",
    defaultSize: "md",
    searchKeywords: ["achievement", "milestone"],
    preview: (
      <WidgetShell eyebrow="Statistics" title="Recent Achievement">
        <StatValue label="100 Backtests Logged" value="+250 XP" />
      </WidgetShell>
    ),
  }),
  nativePreview({
    id: "statistics",
    title: "Statistics",
    description: "Current totals and summary metrics.",
    category: "Statistics",
    icon: "ST",
    defaultSize: "md",
    searchKeywords: ["statistics", "totals", "summary"],
    preview: (
      <WidgetShell eyebrow="Statistics" title="Statistics">
        <div className="grid grid-cols-2 gap-2">
          <StatValue label="Total XP" value={4820} />
          <StatValue label="Completed Quests" value={132} />
          <StatValue label="Today XP" value={65} />
          <StatValue label="This Week" value={410} />
        </div>
      </WidgetShell>
    ),
  }),
  nativePreview({
    id: "chart",
    title: "Progress Chart",
    description: "Flexible progress visualization driven by live quest data.",
    category: "Statistics",
    icon: "PC",
    defaultSize: "xl",
    searchKeywords: ["chart", "progress", "xp"],
    preview: <ChartWidget title="Progress Chart" config={{ chartType: "bar", metric: "xp", timeRange: "7d" }} previewSeries={[20, 45, 30, 60, 25, 70, 40]} />,
  }),
  nativePreview({
    id: "recent-activity",
    title: "Recent Activity",
    description: "A feed of the latest completed actions and events.",
    category: "Productivity",
    icon: "RA",
    defaultSize: "md",
    searchKeywords: ["recent", "activity", "feed"],
    preview: (
      <WidgetShell eyebrow="Productivity" title="Recent Activity">
        <MiniActivityFeed events={[previewEvent("p-ra-1", "Journal every trade", "+25 XP"), previewEvent("p-ra-2", "Train legs", "+30 XP")]} />
      </WidgetShell>
    ),
  }),
  nativePreview({
    id: "trading-performance",
    title: "Trading Performance",
    description: "Trade metrics and system performance summary.",
    category: "Trading",
    icon: "TP",
    defaultSize: "md",
    searchKeywords: ["trading", "performance", "win rate"],
    preview: (
      <WidgetShell eyebrow="Trading" title="Trading Performance">
        <div className="grid grid-cols-2 gap-2">
          <StatValue label="Win Rate" value="64.2%" />
          <StatValue label="EV" value="0.78 R" />
          <StatValue label="Profit Factor" value="2.35" />
          <StatValue label="Backtests" value={232} />
        </div>
      </WidgetShell>
    ),
  }),
  nativePreview({
    id: "habit-tracker",
    title: "Habit Tracker",
    description: "Health and discipline habit completion at a glance.",
    category: "Health",
    icon: "HT",
    defaultSize: "md",
    searchKeywords: ["habit", "tracker", "discipline"],
    preview: (
      <WidgetShell eyebrow="Health" title="Habit Tracker">
        <MiniChecklist
          items={[
            { id: "p-ht-1", title: "Wake up before 6:00", completed: true },
            { id: "p-ht-2", title: "Cold shower", completed: true },
            { id: "p-ht-3", title: "Meditate", completed: false },
          ]}
        />
      </WidgetShell>
    ),
  }),
  nativePreview({
    id: "command-center-header",
    title: "Today Overview",
    description: "Today's date, daily success ring, and the End Day trigger.",
    category: "Today",
    icon: "CC",
    defaultSize: "xl",
    searchKeywords: ["today", "overview", "daily success", "end day"],
    preview: (
      <WidgetShell eyebrow="Today" title="Today">
        <div className="grid grid-cols-2 gap-2">
          <StatValue label="Daily Success" value="72%" />
          <StatValue label="Status" value="In Progress" />
        </div>
      </WidgetShell>
    ),
  }),
  nativePreview({
    id: "minimum-successful-day",
    title: "Minimum Successful Day",
    description: "Today's core quests and the minimum bar for a successful day.",
    category: "Today",
    icon: "MD",
    defaultSize: "lg",
    searchKeywords: ["minimum", "successful day", "core quests"],
    preview: (
      <WidgetShell eyebrow="Today" title="Minimum Successful Day">
        <MiniChecklist
          items={[
            { id: "p-msd-1", title: "Journal every trade", xp: 25, completed: true },
            { id: "p-msd-2", title: "Train legs", xp: 30, completed: true },
            { id: "p-msd-3", title: "Read 20 pages", xp: 15, completed: false },
          ]}
        />
      </WidgetShell>
    ),
  }),
  nativePreview({
    id: "bonus-missions",
    title: "Optional Tasks",
    description: "Optional quests unlocked after the Minimum Successful Day is complete.",
    category: "Today",
    icon: "BM",
    defaultSize: "lg",
    searchKeywords: ["optional", "tasks"],
    preview: (
      <WidgetShell eyebrow="Today" title="Optional Tasks">
        <MiniChecklist items={[{ id: "p-bm-1", title: "Deep-clean the desk", xp: 10, completed: false }]} />
      </WidgetShell>
    ),
  }),
  nativePreview({
    id: "night-review",
    title: "Daily Review",
    description: "End Day trigger that opens the Daily Review snapshot summary.",
    category: "Today",
    icon: "NR",
    defaultSize: "md",
    searchKeywords: ["daily review", "end day", "recap"],
    preview: (
      <WidgetShell eyebrow="Today" title="Daily Review">
        <div className="grid grid-cols-2 gap-2">
          <StatValue label="Reviewed Days" value={12} />
          <StatValue label="Last Success" value="80%" />
        </div>
      </WidgetShell>
    ),
  }),
  nativePreview({
    id: "dream-progress",
    title: "Dream Progress",
    description: "Live long-term system status from the Goal Tree.",
    category: "Today",
    icon: "DP",
    defaultSize: "lg",
    searchKeywords: ["dream", "progress"],
    preview: (
      <WidgetShell eyebrow="Today" title="Dream Progress">
        <MiniProgressList
          items={[
            { id: "p-dpv-1", title: "Become a top trader", subtitle: "dream", progress: 62 },
            { id: "p-dpv-2", title: "Build my physique", subtitle: "dream", progress: 41 },
          ]}
        />
      </WidgetShell>
    ),
  }),
  nativePreview({
    id: "attribute-overview",
    title: "Attribute Overview",
    description: "Live category growth across all your attributes.",
    category: "Today",
    icon: "AO",
    defaultSize: "lg",
    searchKeywords: ["attribute", "overview"],
    preview: (
      <WidgetShell eyebrow="Today" title="Attribute Overview">
        <MiniProgressList
          items={[
            { id: "p-aov-1", title: "Trading", subtitle: "Level 3", progress: 64 },
            { id: "p-aov-2", title: "Discipline", subtitle: "Level 4", progress: 48 },
          ]}
        />
      </WidgetShell>
    ),
  }),
  nativePreview({
    id: "consistency-score",
    title: "Consistency Score",
    description: "Average daily success across recently reviewed days.",
    category: "Today",
    icon: "CS",
    defaultSize: "md",
    searchKeywords: ["consistency", "score"],
    preview: (
      <WidgetShell eyebrow="Today" title="Consistency Score">
        <div className="grid grid-cols-2 gap-2">
          <StatValue label="Score" value="82%" />
          <StatValue label="Reviewed Days" value={12} />
        </div>
      </WidgetShell>
    ),
  }),
  nativePreview({
    id: "today-progress-feed",
    title: "Today's Progress Feed",
    description: "Today's activity feed of quest, XP, and goal events.",
    category: "Today",
    icon: "TF",
    defaultSize: "md",
    searchKeywords: ["today", "progress", "feed"],
    preview: (
      <WidgetShell eyebrow="Today" title="Today's Progress Feed">
        <MiniActivityFeed events={[previewEvent("p-tpf-1", "Journal every trade completed", "+25 XP")]} />
      </WidgetShell>
    ),
  }),
  nativePreview({
    id: "tomorrow-preview",
    title: "Tomorrow Preview",
    description: "Tomorrow's scheduled core quests and the XP on the table.",
    category: "Today",
    icon: "TP2",
    defaultSize: "md",
    searchKeywords: ["tomorrow", "preview"],
    preview: (
      <WidgetShell eyebrow="Today" title="Tomorrow Preview">
        <div className="grid grid-cols-2 gap-2">
          <StatValue label="Core Quests" value={3} />
          <StatValue label="Available XP" value={75} />
        </div>
      </WidgetShell>
    ),
  }),
  nativePreview({
    id: "recent-milestones",
    title: "Recent Milestones",
    description: "Recently completed dreams, goals, and milestones.",
    category: "Today",
    icon: "RM",
    defaultSize: "lg",
    searchKeywords: ["recent", "milestones"],
    preview: (
      <WidgetShell eyebrow="Today" title="Recent Milestones">
        <MiniProgressList items={[{ id: "p-rmv-1", title: "First 100 backtests", subtitle: "milestone", progress: 100 }]} />
      </WidgetShell>
    ),
  }),
  nativePreview({
    id: "xp-overview",
    title: "XP Overview",
    description: "Weekly XP output chart across quests and goal XP.",
    category: "Today",
    icon: "XO",
    defaultSize: "lg",
    searchKeywords: ["xp", "overview", "weekly"],
    preview: (
      <WidgetShell eyebrow="Today" title="XP Overview">
        <MiniBars values={[20, 45, 30, 60, 25, 70, 40]} labels={["M", "T", "W", "T", "F", "S", "S"]} />
      </WidgetShell>
    ),
  }),
];
