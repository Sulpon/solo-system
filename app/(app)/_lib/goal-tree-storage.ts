import { STORAGE_KEYS } from "./storage-keys";
import type { CategoryId } from "./types/category";
import type { AttributeWeight, GoalNode, GoalNodeStatus, GoalNodeType, GoalTree, SequentialMilestoneStep } from "./types/goal-tree";

export const GOAL_TREE_STORAGE_KEY = STORAGE_KEYS.goalTree;

export type GoalNodeDraft = Readonly<{
  id?: string;
  title: string;
  description: string;
  type: GoalNodeType;
  parentId?: string | null;
  attributes?: CategoryId[];
  attributeWeights?: AttributeWeight[];
  xpReward?: number;
  xpAwardedAt?: string | null;
  stepXpReward?: number;
  completionXpReward?: number;
  status: GoalNodeStatus;
  currentValue?: number;
  targetValue?: number;
  unit?: string;
  steps?: SequentialMilestoneStep[];
  currentStepIndex?: number;
  completed?: boolean;
  createdAt?: string;
  updatedAt?: string;
}>;

export function generateGoalNodeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "goal-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export function createGoalNode(draft: GoalNodeDraft): GoalNode {
  const now = new Date().toISOString();
  const currentValue = draft.type === "progress_goal" ? Math.max(0, Number(draft.currentValue ?? 0)) : undefined;
  const targetValue = draft.type === "progress_goal" ? Math.max(1, Number(draft.targetValue ?? 1)) : undefined;
  const progress = draft.type === "progress_goal" ? Math.min(100, Math.round((Math.max(0, Number(draft.currentValue ?? 0)) / Math.max(1, Number(draft.targetValue ?? 1))) * 100)) : 0;
  const steps = draft.type === "sequential_milestone" ? normalizeSequentialSteps(draft.steps ?? []) : undefined;
  const attributes = draft.type === "dream" ? normalizeAttributeList(draft.attributes ?? []) : undefined;
  const attributeWeights = draft.type === "dream" ? normalizeAttributeWeights(draft.attributeWeights ?? [], attributes ?? []) : undefined;

  return {
    id: draft.id ?? generateGoalNodeId(),
    title: draft.title.trim(),
    description: draft.description.trim() || undefined,
    type: draft.type,
    parentId: draft.parentId ?? undefined,
    attributes,
    attributeWeights,
    xpReward: typeof draft.xpReward === "number" ? Math.max(0, Math.floor(Number(draft.xpReward) || 0)) : undefined,
    xpAwardedAt: draft.xpAwardedAt ?? null,
    stepXpReward: typeof draft.stepXpReward === "number" ? Math.max(0, Math.floor(Number(draft.stepXpReward) || 0)) : undefined,
    completionXpReward: typeof draft.completionXpReward === "number" ? Math.max(0, Math.floor(Number(draft.completionXpReward) || 0)) : undefined,
    children: [],
    status: draft.status,
    progress,
    currentValue,
    targetValue,
    unit: draft.type === "progress_goal" ? draft.unit?.trim() || undefined : undefined,
    steps,
    currentStepIndex: draft.type === "sequential_milestone" ? normalizeCurrentStepIndex(steps ?? [], draft.currentStepIndex) : undefined,
    completed: draft.type === "sequential_milestone" ? Boolean(draft.completed) : undefined,
    createdAt: draft.createdAt ?? now,
    updatedAt: draft.updatedAt ?? now,
  };
}

function normalizeAttributeList(attributes: ReadonlyArray<CategoryId>) {
  return [...new Set(attributes.filter(Boolean))];
}

function buildEqualWeightSplit(attributeIds: ReadonlyArray<CategoryId>): AttributeWeight[] {
  if (attributeIds.length === 0) {
    return [];
  }

  const baseWeight = Math.floor(100 / attributeIds.length);
  let remainder = 100 % attributeIds.length;

  return attributeIds.map((attributeId) => {
    const bonus = remainder > 0 ? 1 : 0;
    remainder -= bonus;

    return {
      attributeId,
      weight: baseWeight + bonus,
    };
  });
}

export function normalizeAttributeWeights(weights: ReadonlyArray<AttributeWeight>, attributeIds: ReadonlyArray<CategoryId>) {
  const allowed = new Set(attributeIds);
  const sanitized = weights
    .filter((weight) => allowed.has(weight.attributeId))
    .map((weight) => ({
      attributeId: weight.attributeId,
      weight: Math.max(0, Math.floor(Number(weight.weight) || 0)),
    }));

  if (attributeIds.length === 0) {
    return [];
  }

  if (sanitized.length === 0) {
    return buildEqualWeightSplit(attributeIds);
  }

  const weightMap = new Map(sanitized.map((weight) => [weight.attributeId, weight.weight]));
  const nextWeights = attributeIds.map((attributeId) => ({
    attributeId,
    weight: weightMap.get(attributeId) ?? 0,
  }));

  const totalWeight = nextWeights.reduce((total, weight) => total + weight.weight, 0);

  if (totalWeight === 100) {
    return nextWeights;
  }

  const normalized = buildEqualWeightSplit(attributeIds);
  return normalized;
}

function buildEqualAttributeWeightsFromNode(node: GoalNode) {
  const attributeIds = normalizeAttributeList(node.attributes ?? []);
  return buildEqualWeightSplit(attributeIds);
}

function generateSequentialStepId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "seq-step-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export function createSequentialMilestoneStep(draft?: Partial<SequentialMilestoneStep>): SequentialMilestoneStep {
  return {
    id: draft?.id ?? generateSequentialStepId(),
    title: (draft?.title ?? "").trim(),
    description: draft?.description?.trim() || undefined,
    completed: Boolean(draft?.completed),
    xpReward: typeof draft?.xpReward === "number" ? Math.max(0, Math.floor(Number(draft.xpReward) || 0)) : undefined,
    xpAwardedAt: draft?.xpAwardedAt ?? null,
  };
}

export function normalizeSequentialSteps(steps: ReadonlyArray<SequentialMilestoneStep>): SequentialMilestoneStep[] {
  return steps.map((step) => ({
    id: step.id || generateSequentialStepId(),
    title: step.title.trim(),
    description: step.description?.trim() || undefined,
    completed: Boolean(step.completed),
    xpReward: typeof step.xpReward === "number" ? Math.max(0, Math.floor(Number(step.xpReward) || 0)) : undefined,
    xpAwardedAt: step.xpAwardedAt ?? null,
  }));
}

export function normalizeSequentialStepChain(steps: ReadonlyArray<SequentialMilestoneStep>) {
  const normalized = normalizeSequentialSteps(steps);
  let seenIncomplete = false;

  return normalized.map((step) => {
    if (seenIncomplete) {
      return { ...step, completed: false };
    }

    if (!step.completed) {
      seenIncomplete = true;
      return { ...step, completed: false };
    }

    return step;
  });
}

export function normalizeCurrentStepIndex(steps: ReadonlyArray<SequentialMilestoneStep>, currentStepIndex?: number) {
  if (steps.length === 0) {
    return 0;
  }

  const firstIncomplete = steps.findIndex((step) => !step.completed);

  if (firstIncomplete >= 0) {
    return firstIncomplete;
  }

  const fallback = Number.isFinite(currentStepIndex ?? Number.NaN) ? Math.max(0, Math.min(steps.length, Number(currentStepIndex))) : steps.length;
  return fallback;
}

export function getSequentialMilestoneProgress(steps: ReadonlyArray<SequentialMilestoneStep>) {
  const normalizedSteps = normalizeSequentialStepChain(steps);

  if (normalizedSteps.length === 0) {
    return {
      progress: 0,
      completedCount: 0,
      totalCount: 0,
      currentStepIndex: 0,
      completed: false,
      status: "not_started" as GoalNodeStatus,
    };
  }

  const currentStepIndex = normalizedSteps.findIndex((step) => !step.completed);
  const resolvedCurrentStepIndex = currentStepIndex >= 0 ? currentStepIndex : normalizedSteps.length;
  const completedCount = normalizedSteps.slice(0, resolvedCurrentStepIndex).filter((step) => step.completed).length;
  const totalCount = normalizedSteps.length;
  const progress = Math.round((completedCount / totalCount) * 100);
  const completed = totalCount > 0 && completedCount === totalCount;
  const status: GoalNodeStatus = completed ? "completed" : completedCount > 0 ? "in_progress" : "not_started";

  return {
    progress,
    completedCount,
    totalCount,
    currentStepIndex: resolvedCurrentStepIndex,
    completed,
    status,
  };
}

function getLeafStatusProgress(node: GoalNode) {
  if (node.type === "sequential_milestone") {
    const sequence = getSequentialMilestoneProgress(node.steps ?? []);

    return {
      progress: sequence.progress,
      status: sequence.status,
      completed: sequence.completed,
      currentStepIndex: sequence.currentStepIndex,
    } as const;
  }

  if (node.type === "progress_goal") {
    const currentValue = Math.max(0, Number(node.currentValue ?? 0));
    const targetValue = Math.max(1, Number(node.targetValue ?? 1));
    const progress = Math.min(100, Math.round((currentValue / targetValue) * 100));
    const status: GoalNodeStatus = progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "not_started";

    return {
      progress,
      status,
    };
  }

  if (node.status === "completed") {
    return { progress: 100, status: "completed" as GoalNodeStatus };
  }

  if (node.status === "in_progress") {
    return { progress: 50, status: "in_progress" as GoalNodeStatus };
  }

  return { progress: 0, status: "not_started" as GoalNodeStatus };
}

export function normalizeGoalTree(nodes: GoalTree): GoalTree {
  return nodes.map((node) => {
    const children = normalizeGoalTree(node.children);

    if (node.type === "sequential_milestone") {
      const sequence = getSequentialMilestoneProgress(node.steps ?? []);

      return {
        ...node,
        children: [...children],
        attributes: normalizeAttributeList(node.attributes ?? []),
        attributeWeights: node.attributeWeights ?? [],
        steps: normalizeSequentialStepChain(node.steps ?? []),
        xpReward: typeof node.xpReward === "number" ? Math.max(0, Math.floor(Number(node.xpReward) || 0)) : undefined,
        xpAwardedAt: node.xpAwardedAt ?? null,
        stepXpReward: typeof node.stepXpReward === "number" ? Math.max(0, Math.floor(Number(node.stepXpReward) || 0)) : undefined,
        completionXpReward: typeof node.completionXpReward === "number" ? Math.max(0, Math.floor(Number(node.completionXpReward) || 0)) : undefined,
        progress: sequence.progress,
        status: sequence.status,
        completed: sequence.completed,
        currentStepIndex: sequence.currentStepIndex,
      };
    }

    if (children.length === 0) {
      const leaf = getLeafStatusProgress(node);

      return {
        ...node,
        children: [...children],
        attributes: node.type === "dream" ? normalizeAttributeList(node.attributes ?? []) : node.attributes,
        attributeWeights: node.type === "dream" ? normalizeAttributeWeights(node.attributeWeights ?? [], normalizeAttributeList(node.attributes ?? [])) : node.attributeWeights,
        xpReward: typeof node.xpReward === "number" ? Math.max(0, Math.floor(Number(node.xpReward) || 0)) : undefined,
        xpAwardedAt: node.xpAwardedAt ?? null,
        stepXpReward: typeof node.stepXpReward === "number" ? Math.max(0, Math.floor(Number(node.stepXpReward) || 0)) : undefined,
        completionXpReward: typeof node.completionXpReward === "number" ? Math.max(0, Math.floor(Number(node.completionXpReward) || 0)) : undefined,
        progress: leaf.progress,
        status: leaf.status,
      };
    }

    const totalProgress = children.reduce((sum, child) => sum + child.progress, 0);
    const progress = Math.round(totalProgress / children.length);
    const completedCount = children.reduce((sum, child) => sum + (child.progress === 100 ? 1 : 0), 0);

    const status: GoalNodeStatus = completedCount === children.length ? "completed" : progress > 0 ? "in_progress" : "not_started";

    return {
      ...node,
      children: [...children],
      attributes: node.type === "dream" ? normalizeAttributeList(node.attributes ?? []) : node.attributes,
      attributeWeights: node.type === "dream" ? normalizeAttributeWeights(node.attributeWeights ?? [], normalizeAttributeList(node.attributes ?? [])) : node.attributeWeights,
      xpReward: typeof node.xpReward === "number" ? Math.max(0, Math.floor(Number(node.xpReward) || 0)) : undefined,
      xpAwardedAt: node.xpAwardedAt ?? null,
      stepXpReward: typeof node.stepXpReward === "number" ? Math.max(0, Math.floor(Number(node.stepXpReward) || 0)) : undefined,
      completionXpReward: typeof node.completionXpReward === "number" ? Math.max(0, Math.floor(Number(node.completionXpReward) || 0)) : undefined,
      progress,
      status,
    };
  });
}

export function getInheritedAttributes(nodes: GoalTree, nodeId: string): CategoryId[] {
  const dream = getInheritedDream(nodes, nodeId);
  return dream ? [...(dream.attributes ?? [])] : [];
}

export function getInheritedAttributeWeights(nodes: GoalTree, nodeId: string): AttributeWeight[] {
  const dream = getInheritedDream(nodes, nodeId);

  if (!dream) {
    return [];
  }

  const attributeIds = normalizeAttributeList(dream.attributes ?? []);
  const attributeWeights = normalizeAttributeWeights(dream.attributeWeights ?? [], attributeIds);
  return attributeWeights.length > 0 ? attributeWeights : buildEqualWeightSplit(attributeIds);
}

function getInheritedDream(nodes: GoalTree, nodeId: string): GoalNode | null {
  function getPath(currentNodes: GoalTree): GoalNode[] | null {
    for (const node of currentNodes) {
      if (node.id === nodeId) {
        return [node];
      }

      const nested = getPath(node.children);

      if (nested) {
        return [node, ...nested];
      }
    }

    return null;
  }

  const path = getPath(nodes);

  if (!path) {
    return null;
  }

  for (let index = path.length - 1; index >= 0; index -= 1) {
    const node = path[index];

    if (node.type === "dream") {
      return node;
    }
  }

  return null;
}

export function findGoalNode(nodes: GoalTree, nodeId: string): GoalNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }

    const nested = findGoalNode(node.children, nodeId);

    if (nested) {
      return nested;
    }
  }

  return null;
}

// Path from a root node down to (and including) nodeId, or null if not found.
export function getAncestorChain(nodes: GoalTree, nodeId: string): GoalNode[] | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return [node];
    }

    const nested = getAncestorChain(node.children, nodeId);

    if (nested) {
      return [node, ...nested];
    }
  }

  return null;
}

export function insertGoalNode(nodes: GoalTree, parentId: string | null | undefined, nextNode: GoalNode): GoalNode[] {
  if (!parentId) {
    return [...nodes, nextNode];
  }

  return nodes.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: [...node.children, nextNode] };
    }

    const updatedChildren = insertGoalNode(node.children, parentId, nextNode);

    if (updatedChildren === node.children) {
      return node;
    }

    return { ...node, children: [...updatedChildren] };
  });
}

export function updateGoalNode(nodes: GoalTree, nodeId: string, updater: (current: GoalNode) => GoalNode): GoalNode[] {
  return nodes.map((node) => {
    if (node.id === nodeId) {
      return updater(node);
    }

    const updatedChildren = updateGoalNode(node.children, nodeId, updater);

    if (updatedChildren === node.children) {
      return node;
    }

    return { ...node, children: [...updatedChildren] };
  });
}

export function removeGoalNode(nodes: GoalTree, nodeId: string): GoalNode[] {
  const nextNodes = nodes
    .filter((node) => node.id !== nodeId)
    .map((node) => ({ ...node, children: removeGoalNode(node.children, nodeId) }));

  return nextNodes;
}

export function collectProgressGoalNodes(nodes: GoalTree): GoalNode[] {
  return nodes.flatMap((node) => {
    const nested = collectProgressGoalNodes(node.children);

    if (node.type === "progress_goal") {
      return [node, ...nested];
    }

    return nested;
  });
}

export function adjustProgressGoalValue(nodes: GoalTree, nodeId: string, increment: number): GoalTree {
  const safeIncrement = Number.isFinite(increment) ? increment : 0;

  const nextNodes = nodes.map((node) => {
    if (node.id === nodeId && node.type === "progress_goal") {
      const currentValue = Math.max(0, Number(node.currentValue ?? 0));
      const targetValue = Math.max(1, Number(node.targetValue ?? 1));
      const nextValue = Math.max(0, currentValue + safeIncrement);
      const nextProgress = Math.min(100, Math.round((nextValue / targetValue) * 100));
      const status: GoalNodeStatus = nextProgress >= 100 ? "completed" : nextValue > 0 ? "in_progress" : "not_started";

      return {
        ...node,
        currentValue: nextValue,
        progress: nextProgress,
        status,
        updatedAt: new Date().toISOString(),
      };
    }

    const updatedChildren = adjustProgressGoalValue(node.children, nodeId, safeIncrement);

    if (updatedChildren === node.children) {
      return node;
    }

    return { ...node, children: [...updatedChildren] };
  });

  return normalizeGoalTree(nextNodes);
}

export function updateSequentialMilestoneNode(
  nodes: GoalTree,
  nodeId: string,
  updater: (current: GoalNode) => GoalNode,
): GoalTree {
  const nextNodes = nodes.map((node) => {
    if (node.id === nodeId) {
      return updater(node);
    }

    const updatedChildren = updateSequentialMilestoneNode(node.children, nodeId, updater);

    if (updatedChildren === node.children) {
      return node;
    }

    return { ...node, children: [...updatedChildren] };
  });

  return normalizeGoalTree(nextNodes);
}

export function completeSequentialMilestoneStep(nodes: GoalTree, nodeId: string): GoalTree {
  const nextNodes = nodes.map((node) => {
    if (node.id === nodeId && node.type === "sequential_milestone") {
      const steps = normalizeSequentialStepChain(node.steps ?? []);

      if (steps.length === 0) {
        return {
          ...node,
          steps,
          progress: 0,
          completed: false,
          currentStepIndex: 0,
          status: "not_started" as GoalNodeStatus,
          updatedAt: new Date().toISOString(),
        };
      }

      const currentStepIndex = normalizeCurrentStepIndex(steps);

      if (currentStepIndex >= steps.length) {
        return {
          ...node,
          steps,
          progress: 100,
          completed: true,
          currentStepIndex: steps.length,
          status: "completed" as GoalNodeStatus,
          updatedAt: new Date().toISOString(),
        };
      }

      const nextSteps = steps.map((step, index) => (index === currentStepIndex ? { ...step, completed: true } : step));
      const nextCurrentStepIndex = normalizeCurrentStepIndex(nextSteps);
      const sequence = getSequentialMilestoneProgress(nextSteps);

      return {
        ...node,
        steps: nextSteps,
        progress: sequence.progress,
        completed: sequence.completed,
        currentStepIndex: nextCurrentStepIndex,
        status: sequence.status,
        updatedAt: new Date().toISOString(),
      };
    }

    const updatedChildren = completeSequentialMilestoneStep(node.children, nodeId);

    if (updatedChildren === node.children) {
      return node;
    }

    return { ...node, children: [...updatedChildren] };
  });

  return normalizeGoalTree(nextNodes);
}

export function undoSequentialMilestoneStep(nodes: GoalTree, nodeId: string): GoalTree {
  const nextNodes = nodes.map((node) => {
    if (node.id === nodeId && node.type === "sequential_milestone") {
      const steps = normalizeSequentialStepChain(node.steps ?? []);

      if (steps.length === 0) {
        return {
          ...node,
          steps,
          progress: 0,
          completed: false,
          currentStepIndex: 0,
          status: "not_started" as GoalNodeStatus,
          updatedAt: new Date().toISOString(),
        };
      }

      const lastCompletedIndex = steps.reduce((index, step, currentIndex) => (step.completed ? currentIndex : index), -1);

      if (lastCompletedIndex < 0) {
        return node;
      }

      const nextSteps = steps.map((step, index) => {
        if (index === lastCompletedIndex) {
          return { ...step, completed: false };
        }

        if (index > lastCompletedIndex) {
          return { ...step, completed: false };
        }

        return step;
      });

      const sequence = getSequentialMilestoneProgress(nextSteps);

      return {
        ...node,
        steps: nextSteps,
        progress: sequence.progress,
        completed: sequence.completed,
        currentStepIndex: sequence.currentStepIndex,
        status: sequence.status,
        updatedAt: new Date().toISOString(),
      };
    }

    const updatedChildren = undoSequentialMilestoneStep(node.children, nodeId);

    if (updatedChildren === node.children) {
      return node;
    }

    return { ...node, children: [...updatedChildren] };
  });

  return normalizeGoalTree(nextNodes);
}
