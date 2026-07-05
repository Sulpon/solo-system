"use client";

import { getWidgetDefinition } from "../../_lib/widgets/widget-registry";
import type { DailyQuest } from "../../_lib/types/quest";
import type { DashboardWidget } from "../../_lib/types/dashboard-widget";

type DashboardWidgetRendererProps = Readonly<{
  widget: DashboardWidget;
  quests?: DailyQuest[];
  onEnterEditMode?: () => void;
}>;

export default function DashboardWidgetRenderer({ widget, quests, onEnterEditMode }: DashboardWidgetRendererProps) {
  const definition = getWidgetDefinition(widget.type);

  if (!definition) {
    return null;
  }

  const Component = definition.component;

  return <Component widget={widget} quests={quests} onEnterEditMode={onEnterEditMode} />;
}
