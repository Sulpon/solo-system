// The Thesis Dashboard is a single overview snapshot, not a list - one
// thesis, one info block, one progress reading, one current focus. Timeline
// is the only list here (milestones and deadlines share the same shape).

export type ThesisInfo = Readonly<{
  title: string;
  researchQuestion: string;
  supervisors: ReadonlyArray<string>;
  expectedGraduation: string;
}>;

export type ThesisProgress = Readonly<{
  research: number;
  writing: number;
}>;

export type ThesisCurrentFocus = Readonly<{
  currentTask: string;
  nextMilestone: string;
  currentBottleneck: string;
}>;

export type TimelineItemKind = "Milestone" | "Deadline";

export const TIMELINE_ITEM_KINDS: ReadonlyArray<TimelineItemKind> = ["Milestone", "Deadline"];

export type TimelineItem = Readonly<{
  id: string;
  title: string;
  date: string;
  kind: TimelineItemKind;
}>;

export type ThesisDashboardData = Readonly<{
  info: ThesisInfo;
  progress: ThesisProgress;
  currentFocus: ThesisCurrentFocus;
  timeline: ReadonlyArray<TimelineItem>;
}>;

export function createTimelineItemId() {
  return `timeline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createTimelineItem(): TimelineItem {
  return { id: createTimelineItemId(), title: "", date: "", kind: "Milestone" };
}

export const DEFAULT_THESIS_DASHBOARD: ThesisDashboardData = {
  info: { title: "", researchQuestion: "", supervisors: [], expectedGraduation: "" },
  progress: { research: 0, writing: 0 },
  currentFocus: { currentTask: "", nextMilestone: "", currentBottleneck: "" },
  timeline: [],
};
