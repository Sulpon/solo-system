import type { CategoryId } from "./category";

export type GoalNodeType = "dream" | "long_term_goal" | "milestone" | "quest" | "progress_goal" | "sequential_milestone";

export type AttributeWeight = Readonly<{
  attributeId: CategoryId;
  weight: number;
}>;

export type SequentialMilestoneStep = Readonly<{
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  xpReward?: number;
  xpAwardedAt?: string | null;
}>;

export type GoalNodeStatus = "not_started" | "in_progress" | "completed";

export type GoalNode = Readonly<{
  id: string;
  title: string;
  description?: string;
  type: GoalNodeType;
  parentId?: string;
  attributes?: CategoryId[];
  attributeWeights?: AttributeWeight[];
  xpReward?: number;
  xpAwardedAt?: string | null;
  stepXpReward?: number;
  completionXpReward?: number;
  children: GoalNode[];
  status: GoalNodeStatus;
  progress: number;
  currentValue?: number;
  targetValue?: number;
  unit?: string;
  // When set (progress_goal only), currentValue is kept in sync with this
  // metric's real activity data instead of being hand-typed - see
  // goal-metrics.ts and useGoalMetricSync.ts.
  metricSource?: string;
  steps?: SequentialMilestoneStep[];
  currentStepIndex?: number;
  completed?: boolean;
  createdAt: string;
  updatedAt: string;
}>;

export type GoalTree = ReadonlyArray<GoalNode>;

export type GoalTreeSummary = Readonly<{
  rootCount: number;
  directChildrenCount: number;
  completedChildrenCount: number;
  progress: number;
}>;
