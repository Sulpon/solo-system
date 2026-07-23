import type { ReactNode } from "react";
import type { WidgetLiveContext } from "./catalog-helpers";

export type CatalogWidgetMode = "preview" | "live";

export type CatalogWidgetSize = "sm" | "md" | "lg" | "xl";

// "dashboard" | "goal-tree" work everywhere they're named; "attributes" is a wildcard
// meaning "any attribute page" (dynamic /attributes/[attributeId]); a literal attribute
// id (e.g. "trading") scopes a widget to that one specific attribute page only.
export type CatalogSupportedPage = "dashboard" | "goal-tree" | "attributes" | (string & {});

export type CatalogWidgetComponentProps = Readonly<{ mode: CatalogWidgetMode; config?: Record<string, string> }>;

export type CatalogWidgetConfigOption = Readonly<{ value: string; label: string }>;

// A minimal, generic per-instance settings field. Scoped deliberately to one
// field type (a select populated from live data) - just enough for widgets
// like "Exercise Progress" that need the user to pick which of their own
// logged items an instance tracks, without hardcoding those items anywhere.
export type CatalogWidgetConfigField = Readonly<{
  key: string;
  label: string;
  options: (ctx: WidgetLiveContext) => ReadonlyArray<CatalogWidgetConfigOption>;
}>;

export type CatalogWidgetDefinition = Readonly<{
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  defaultSize: CatalogWidgetSize;
  allowedSizes: ReadonlyArray<CatalogWidgetSize>;
  supportedPages: ReadonlyArray<CatalogSupportedPage>;
  readOnly: true;
  searchKeywords: ReadonlyArray<string>;
  component: (props: CatalogWidgetComponentProps) => ReactNode;
  // When present, this widget can be added to a page multiple times, each
  // instance configured independently via these fields (see
  // PageSectionSettingsModal.tsx / CustomizablePage.tsx).
  configFields?: ReadonlyArray<CatalogWidgetConfigField>;
}>;
