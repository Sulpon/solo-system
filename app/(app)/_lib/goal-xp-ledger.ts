import { calculateQuestAttributeXP } from "./goal-tree-attributes";
import { getInheritedAttributeWeights, normalizeGoalTree, normalizeSequentialStepChain } from "./goal-tree-storage";
import type { GoalTree, GoalNode } from "./types/goal-tree";
import type { XpEvent, XpEventAttributeReward, XpEventSourceType } from "./types/progression";
import type { AttributeWeight } from "./types/goal-tree";

function generateXpEventId(sourceId: string, createdAt: string) {
  return `${sourceId}-${createdAt}`;
}

function toAttributeXpRewards(attributeRewards: ReadonlyArray<AttributeWeight>, amount: number): XpEventAttributeReward[] {
  return calculateQuestAttributeXP(amount, attributeRewards).map((reward) => ({
    attributeId: reward.attributeId,
    amount: reward.xp,
  }));
}

function hasEvent(existingEvents: ReadonlyArray<XpEvent>, sourceId: string, sourceType: XpEventSourceType) {
  return existingEvents.some((event) => event.sourceId === sourceId && event.sourceType === sourceType);
}

function createEvent({
  node,
  sourceType,
  sourceId,
  amount,
  attributeRewards,
  createdAt,
}: Readonly<{
  node: GoalNode;
  sourceType: XpEventSourceType;
  sourceId: string;
  amount: number;
  attributeRewards: XpEventAttributeReward[];
  createdAt: string;
}>): XpEvent {
  return {
    id: generateXpEventId(sourceId, createdAt),
    sourceType,
    sourceId,
    sourceTitle: node.title,
    amount,
    attributeXp: attributeRewards,
    createdAt,
  };
}

type AwardResult = Readonly<{
  tree: GoalTree;
  events: XpEvent[];
  awarded: XpEvent[];
}>;

function awardNode(node: GoalNode, tree: GoalTree, existingEvents: ReadonlyArray<XpEvent>, createdAt: string): { node: GoalNode; events: XpEvent[] } {
  let nextNode: GoalNode = node;
  const nextEvents: XpEvent[] = [];
  const inheritedAttributeWeights = getInheritedAttributeWeights(tree, node.id);

  function awardOnce(sourceType: XpEventSourceType, sourceId: string, amount: number, attributes: XpEventAttributeReward[]) {
    if (amount <= 0 || hasEvent(existingEvents, sourceId, sourceType)) {
      return;
    }

    const event = createEvent({
      node: nextNode,
      sourceType,
      sourceId,
      amount,
      attributeRewards: attributes,
      createdAt,
    });

    nextEvents.push(event);
  }

  if (nextNode.type === "sequential_milestone") {
    const steps = normalizeSequentialStepChain(nextNode.steps ?? []);
    const nextSteps = steps.map((step) => {
      if (!step.completed) {
        return step;
      }

      if (step.xpAwardedAt) {
        return step;
      }

      const stepReward = Math.max(0, Number(nextNode.stepXpReward ?? 0));
      if (stepReward > 0) {
        awardOnce("sequential_step", `${nextNode.id}:${step.id}`, stepReward, toAttributeXpRewards(inheritedAttributeWeights, stepReward));
      }

      return {
        ...step,
        xpAwardedAt: createdAt,
      };
    });

    const allCompleted = nextSteps.length > 0 && nextSteps.every((step) => step.completed);
    const nextNodeCompletion = nextNode.xpAwardedAt ? nextNode.xpAwardedAt : allCompleted ? createdAt : nextNode.xpAwardedAt ?? null;

    if (allCompleted && !nextNode.xpAwardedAt) {
      const completionReward = Math.max(0, Number(nextNode.completionXpReward ?? nextNode.xpReward ?? 0));
      if (completionReward > 0) {
        awardOnce("sequential_milestone", nextNode.id, completionReward, toAttributeXpRewards(inheritedAttributeWeights, completionReward));
      }
    }

    nextNode = {
      ...nextNode,
      steps: nextSteps,
      xpAwardedAt: nextNodeCompletion,
    };

    return { node: nextNode, events: nextEvents };
  }

  const completionReward = Math.max(0, Number(nextNode.xpReward ?? 0));
  const isCompleted = nextNode.status === "completed" || nextNode.progress >= 100;

  if (isCompleted && !nextNode.xpAwardedAt && completionReward > 0) {
    const sourceType = nextNode.type === "progress_goal" ? "progress_goal" : nextNode.type === "dream" ? "dream" : nextNode.type === "long_term_goal" ? "goal" : "milestone";
    awardOnce(sourceType, nextNode.id, completionReward, toAttributeXpRewards(inheritedAttributeWeights, completionReward));
    nextNode = {
      ...nextNode,
      xpAwardedAt: createdAt,
    };
  }

  if (nextNode.type === "progress_goal" && nextNode.progress >= 100 && !nextNode.xpAwardedAt && completionReward <= 0) {
    nextNode = {
      ...nextNode,
      xpAwardedAt: createdAt,
    };
  }

  return { node: nextNode, events: nextEvents };
}

function walk(nodes: GoalTree, tree: GoalTree, existingEvents: ReadonlyArray<XpEvent>, createdAt: string): AwardResult {
  let nextEvents: XpEvent[] = [];
  const nextNodes = nodes.map((node) => {
    const childResult = walk(node.children, tree, existingEvents, createdAt);
    nextEvents = [...nextEvents, ...childResult.events];
    const completedNode = { ...node, children: [...childResult.tree] };
    const awardResult = awardNode(completedNode, tree, existingEvents, createdAt);
    nextEvents = [...nextEvents, ...awardResult.events];
    return awardResult.node;
  });

  return {
    tree: normalizeGoalTree(nextNodes),
    events: nextEvents,
    awarded: nextEvents,
  };
}

export function awardGoalTreeXpEvents(goalTree: GoalTree, existingEvents: ReadonlyArray<XpEvent>, createdAt = new Date().toISOString()) {
  const normalized = normalizeGoalTree(goalTree);
  const result = walk(normalized, normalized, existingEvents, createdAt);
  return {
    tree: result.tree,
    events: [...existingEvents, ...result.awarded],
    awarded: result.awarded,
  };
}
