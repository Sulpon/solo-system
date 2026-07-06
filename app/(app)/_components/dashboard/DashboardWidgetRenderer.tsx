"use client";

import { getCatalogWidget } from "../../_lib/widgets/catalog-registry";
import { getWidgetDefinition } from "../../_lib/widgets/widget-registry";
import WidgetRenderer from "../widgets/WidgetRenderer";
import type { DailyQuest } from "../../_lib/types/quest";
import type { DashboardWidget } from "../../_lib/types/dashboard-widget";

type DashboardWidgetRendererProps = Readonly<{
  widget: DashboardWidget;
  quests?: DailyQuest[];
  onEnterEditMode?: () => void;
}>;

export default function DashboardWidgetRenderer({ widget, quests, onEnterEditMode }: DashboardWidgetRendererProps) {
  const definition = getWidgetDefinition(widget.type);

  if (definition) {
    const Component = definition.component;
    return <Component widget={widget} quests={quests} onEnterEditMode={onEnterEditMode} />;
  }

  const catalogWidget = getCatalogWidget(widget.type);

  if (!catalogWidget) {
    return null;
  }

  return <WidgetRenderer widget={catalogWidget} mode="live" />;
}
