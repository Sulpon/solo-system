import type { WidgetSize } from "../../_lib/widgets/layout-list";

export type PageSectionSize = WidgetSize;

export type EditablePageSection = Readonly<{
  id: string;
  title: string;
  description?: string;
  size: PageSectionSize;
  content: React.ReactNode;
  readOnly?: true;
}>;

export type PageSectionLayoutItem = Readonly<{
  id: string;
  baseId: string;
  title: string;
  visible: boolean;
  order: number;
  size: PageSectionSize;
  // Only meaningful for catalog widgets that declare `configFields` (see
  // catalog-types.ts) - e.g. which exercise an "Exercise Progress" instance tracks.
  config?: Record<string, string>;
}>;

export type PageSectionLayout = Readonly<{
  id: string;
  pageId: string;
  sections: PageSectionLayoutItem[];
  updatedAt: string;
}>;
