"use client";

import type { CatalogWidgetDefinition, CatalogWidgetMode } from "../../_lib/widgets/catalog-types";

type WidgetRendererProps = Readonly<{
  widget: CatalogWidgetDefinition;
  mode: CatalogWidgetMode;
  config?: Record<string, string>;
}>;

export default function WidgetRenderer({ widget, mode, config }: WidgetRendererProps) {
  const Component = widget.component;
  return <Component mode={mode} config={config} />;
}
