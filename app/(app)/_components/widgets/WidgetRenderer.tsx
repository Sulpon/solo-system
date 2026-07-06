"use client";

import type { CatalogWidgetDefinition, CatalogWidgetMode } from "../../_lib/widgets/catalog-types";

type WidgetRendererProps = Readonly<{
  widget: CatalogWidgetDefinition;
  mode: CatalogWidgetMode;
}>;

export default function WidgetRenderer({ widget, mode }: WidgetRendererProps) {
  const Component = widget.component;
  return <Component mode={mode} />;
}
