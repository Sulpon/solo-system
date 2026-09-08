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

// A measurement criterion attached to a Quarterly Goal (a long_term_goal
// node with periodType "quarter") - the OKR "Key Results" scoreboard.
// Deliberately NOT part of GoalNode progress calculation: the Quarterly
// Goal's actual progress stays the existing Monthly-Milestone rollup: see
// goal-tree-progress.ts. Key Results are tracked and displayed separately so
// there is only ever one source of truth for a node's progress bar.
export type KeyResult = Readonly<{
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit?: string;
}>;

// Which Planning time-box role this node plays, if any - see the Planning
// architecture notes in engines/planning-engine.ts. Existing nodes have none
// of these set and are completely unaffected: Planning is an opt-in lens
// over the same GoalNode tree /goals already reads and writes, not a
// separate data model. Role mapping (no new GoalNodeType values):
//   Dream            -> type "dream"            (periodType unused)
//   Quarterly Goal    -> type "long_term_goal"    periodType "quarter"
//   Monthly Milestone -> type "milestone"         periodType "month"
//   Weekly Milestone  -> type "progress_goal"     periodType "week"
export type GoalNodePeriodType = "quarter" | "month" | "week";

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
  // Optional link to a World Map country - the Goal remains the single
  // source of truth for progress/completion; this just lets the World Map
  // visualize where it exists. See engines/world-map-engine.ts.
  worldMapLocationId?: string;
  // Optional further refinement to one of that country's cities. Only
  // meaningful alongside worldMapLocationId - a Goal is assigned to a
  // Country first, and optionally to one of its Cities.
  worldMapCityId?: string;
  // Planning metadata - see GoalNodePeriodType above. All optional/opt-in.
  periodType?: GoalNodePeriodType;
  periodStart?: string;
  periodEnd?: string;
  keyResults?: ReadonlyArray<KeyResult>;
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
