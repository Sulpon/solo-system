export type DashboardDreamItem = Readonly<{
  id: string;
  title: string;
  subtitle: string;
  progress: number;
  updatedAt: string;
  depth: number;
}>;

export type DashboardMilestoneItem = Readonly<{
  title: string;
  subtitle: string;
  date: string;
  accent: string;
}>;

export type DashboardMetricSeriesPoint = Readonly<{
  key: string;
  label: string;
  value: number;
}>;

export type DashboardTimeSlice = Readonly<{
  label: string;
  value: number;
  accent: string;
}>;

