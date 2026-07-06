import type { ComponentType } from "react";
import type { WidgetSize } from "../widgets/layout-list";
import type { CategoryId } from "./category";
import type { DailyQuest } from "./quest";

// Widened from a closed literal union to `string` so widgets sourced from the
// unified catalog registry (app/(app)/_lib/widgets/catalog-registry.tsx) can
// also be placed on the Dashboard grid alongside these built-in ids.
export type DashboardWidgetType = string;

export type WidgetCategory =
  | "Character"
  | "Quests"
  | "Trading"
  | "Productivity"
  | "Health"
  | "Learning"
  | "Statistics"
  | "Finance"
  | "Social"
  | "AI"
  | "Experimental"
  | "Command Center";

export type DashboardWidgetSize = WidgetSize;
export type WidgetPadding = "compact" | "normal" | "relaxed";
export type WidgetAccent = "purple" | "cyan" | "emerald" | "amber" | "rose" | "blue";
export type ChartType = "line" | "bar" | "area";
export type ChartMetric = "xp" | "completed-quests" | "trading" | "health";
export type ChartTimeRange = "7d" | "30d" | "90d" | "all";

export type ChartWidgetConfig = Readonly<{
  chartType: ChartType;
  metric: ChartMetric;
  categoryId?: CategoryId;
  timeRange: ChartTimeRange;
}>;

export type BaseWidgetConfig = Readonly<{
  description?: string;
}>;

export type CharacterWidgetConfig = BaseWidgetConfig;
export type DailyQuestWidgetConfig = BaseWidgetConfig & Readonly<{ showCompletedCount?: boolean }>;
export type MainQuestWidgetConfig = BaseWidgetConfig;
export type StatisticsWidgetConfig = BaseWidgetConfig & Readonly<{ metricIds?: string[] }>;
export type AchievementWidgetConfig = BaseWidgetConfig & Readonly<{ achievementId?: string }>;
export type CategoryWidgetConfig = BaseWidgetConfig & Readonly<{ categoryIds?: CategoryId[] }>;

export type DashboardWidgetConfig =
  | CharacterWidgetConfig
  | DailyQuestWidgetConfig
  | MainQuestWidgetConfig
  | StatisticsWidgetConfig
  | AchievementWidgetConfig
  | CategoryWidgetConfig
  | ChartWidgetConfig;

export type WidgetSettings = Readonly<{
  showTitle: boolean;
  compactMode: boolean;
  accentColor: WidgetAccent;
  showBorder: boolean;
  transparency: number;
  padding: WidgetPadding;
  refreshInterval: number | null;
}>;

export type WidgetRendererProps = Readonly<{
  widget: DashboardWidget;
  quests?: DailyQuest[];
  onEnterEditMode?: () => void;
}>;

export type WidgetRenderer = ComponentType<WidgetRendererProps>;

export type WidgetDefinition = Readonly<{
  id: DashboardWidgetType;
  title: string;
  description: string;
  icon: string;
  category: WidgetCategory;
  defaultSize: DashboardWidgetSize;
  defaultRow: string;
  canDuplicate: boolean;
  canDelete: boolean;
  canHide: boolean;
  defaultSettings: WidgetSettings;
  defaultConfig?: DashboardWidgetConfig;
  component: WidgetRenderer;
}>;

export type DashboardWidget = Readonly<{
  id: string;
  type: DashboardWidgetType;
  title: string;
  visible: boolean;
  order: number;
  size: DashboardWidgetSize;
  settings: WidgetSettings;
  config?: DashboardWidgetConfig;
}>;

export type DashboardLayout = Readonly<{
  id: string;
  userId: string;
  layoutVersion: number;
  widgets: DashboardWidget[];
  updatedAt: string;
}>;

export type DashboardRow = Readonly<{
  id: string;
  widgetIds: string[];
}>;

export type DashboardGridLayout = Readonly<{
  id: string;
  layoutVersion: number;
  rows: DashboardRow[];
  updatedAt: string;
}>;

export type WidgetState = DashboardWidget;
export type WidgetLayout = DashboardGridLayout;
