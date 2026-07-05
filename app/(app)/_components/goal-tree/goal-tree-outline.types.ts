import type { GoalNodeType } from "../../_lib/types/goal-tree";
import type { GoalNodeView } from "../../_lib/goal-tree-progress";

export type GoalTreeFilterKey = "all" | "dreams" | "goals" | "milestones" | "progress_goals" | "daily_quests";

export type GoalTreeOutlineRowView = Readonly<{
  node: GoalNodeView;
  depth: number;
}>;

export const goalTreeFilterTabs: ReadonlyArray<Readonly<{ key: GoalTreeFilterKey; label: string }>> = [
  { key: "all", label: "All" },
  { key: "dreams", label: "Dreams" },
  { key: "goals", label: "Goals" },
  { key: "milestones", label: "Milestones" },
  { key: "progress_goals", label: "Progress Goals" },
  { key: "daily_quests", label: "Daily Quests" },
];

export const goalTreeTypeFilterMap: Readonly<Record<Exclude<GoalTreeFilterKey, "all">, ReadonlyArray<GoalNodeType>>> = {
  dreams: ["dream"],
  goals: ["long_term_goal"],
  milestones: ["milestone", "sequential_milestone"],
  progress_goals: ["progress_goal"],
  daily_quests: ["quest"],
};
