import type { DashboardWidget } from "../../_lib/types/dashboard-widget";

const sizeClassNames: Record<DashboardWidget["size"], string> = {
  sm: "col-span-12 md:col-span-4",
  md: "col-span-12 md:col-span-6",
  lg: "col-span-12 md:col-span-8",
  xl: "col-span-12",
};

type WidgetFrameProps = Readonly<{
  widget: DashboardWidget;
  children: React.ReactNode;
}>;

export default function WidgetFrame({ widget, children }: WidgetFrameProps) {
  return <div className={sizeClassNames[widget.size]}>{children}</div>;
}
