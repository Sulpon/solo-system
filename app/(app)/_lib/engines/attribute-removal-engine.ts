import { collectAllNodes } from "./goal-tree-graph";
import type { Category, CategoryId } from "../types/category";
import type { GoalTree } from "../types/goal-tree";
import type { Quest } from "../types/quest";

// Removing an attribute, and being honest about what it costs.
//
// An attribute is not just a row in a list: it owns a route
// (/attributes/[attributeId]), and Quest.categoryId and GoalNode.attributeId
// point straight at its id. Dropping one therefore leaves anything still
// pointing at it without a page to live on.
//
// This engine does NOT cascade. Deleting an attribute deletes the
// attribute, never the user's quests, goals or completion history - a
// cascade would turn one click into irreversible data loss across several
// collections, and the records are far more valuable than the grouping.
// What it does instead is count what will be orphaned, so the UI can say so
// before anything happens.
//
// Orphans are recoverable by design: recreating an attribute with the SAME
// id reunites it with everything that referenced it, because every link is
// by id rather than by position.

export type AttributeImpact = Readonly<{
  attributeId: CategoryId;
  // Quests filed under this attribute - they keep existing, but lose the
  // page that grouped them.
  questCount: number;
  // Goal nodes referencing this attribute anywhere in the tree, including
  // collapsed branches.
  goalCount: number;
  // Quests that award XP to this attribute without being filed under it.
  rewardReferenceCount: number;
  // Removing the last attribute would leave Atlas with no attribute pages
  // at all, which onboarding treats as "never set up" - worth refusing.
  isLastAttribute: boolean;
  hasReferences: boolean;
}>;

export function summariseAttributeImpact(attributeId: CategoryId, quests: ReadonlyArray<Quest>, goalTree: GoalTree, attributeCount: number): AttributeImpact {
  const questCount = quests.filter((quest) => quest.categoryId === attributeId).length;

  // A goal can reference an attribute either as a plain member of
  // `attributes` or through a weighted split in `attributeWeights`, and the
  // two are not kept in lockstep - both have to be checked or the count
  // understates the damage.
  const goalCount = collectAllNodes(goalTree).filter(
    (node) => (node.attributes ?? []).includes(attributeId) || (node.attributeWeights ?? []).some((weight) => weight.attributeId === attributeId),
  ).length;

  const rewardReferenceCount = quests.filter(
    (quest) => quest.categoryId !== attributeId && (quest.attributeXPOverride ?? []).some((reward) => reward.attributeId === attributeId),
  ).length;

  return {
    attributeId,
    questCount,
    goalCount,
    rewardReferenceCount,
    isLastAttribute: attributeCount <= 1,
    hasReferences: questCount > 0 || goalCount > 0 || rewardReferenceCount > 0,
  };
}

export function removeAttribute(attributes: ReadonlyArray<Category>, attributeId: CategoryId): Category[] {
  return attributes.filter((attribute) => attribute.id !== attributeId);
}

// One line the user reads before confirming. Deliberately names real
// numbers rather than a vague "some items will be affected" - the whole
// point is that they can judge whether the cost is acceptable.
export function describeAttributeImpact(impact: AttributeImpact): string {
  const parts: string[] = [];

  if (impact.questCount > 0) {
    parts.push(`${impact.questCount} quest${impact.questCount === 1 ? "" : "s"}`);
  }

  if (impact.goalCount > 0) {
    parts.push(`${impact.goalCount} goal${impact.goalCount === 1 ? "" : "s"}`);
  }

  if (impact.rewardReferenceCount > 0) {
    parts.push(`${impact.rewardReferenceCount} quest${impact.rewardReferenceCount === 1 ? "" : "s"} awarding XP to it`);
  }

  if (parts.length === 0) {
    return "Nothing references this attribute.";
  }

  // Agreement follows the real total, not the number of clauses: "1 quest
  // still references" but "2 quests, 1 goal still reference".
  const total = impact.questCount + impact.goalCount + impact.rewardReferenceCount;
  const verb = total === 1 ? "references" : "reference";
  const subject = total === 1 ? "It will be kept" : "They will be kept";

  return `${parts.join(", ")} still ${verb} this attribute. ${subject}, but will no longer have an attribute page.`;
}
