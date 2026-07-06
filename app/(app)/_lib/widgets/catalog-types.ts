import type { ReactNode } from "react";

export type CatalogWidgetMode = "preview" | "live";

export type CatalogWidgetSize = "sm" | "md" | "lg" | "xl";

// "dashboard" | "goal-tree" work everywhere they're named; "attributes" is a wildcard
// meaning "any attribute page" (dynamic /attributes/[attributeId]); a literal attribute
// id (e.g. "trading") scopes a widget to that one specific attribute page only.
export type CatalogSupportedPage = "dashboard" | "goal-tree" | "attributes" | (string & {});

export type CatalogWidgetComponentProps = Readonly<{ mode: CatalogWidgetMode }>;

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
}>;
