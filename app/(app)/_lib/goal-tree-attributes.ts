import type { CategoryId } from "./types/category";
import type { AttributeWeight } from "./types/goal-tree";

export type QuestAttributeXp = Readonly<{
  attributeId: CategoryId;
  xp: number;
}>;

export function buildDefaultAttributeRewards(attributeIds: ReadonlyArray<CategoryId>, totalXp: number): QuestAttributeXp[] {
  if (attributeIds.length === 0) {
    return [];
  }

  const safeTotalXp = Math.max(0, Math.floor(Number(totalXp) || 0));
  const baseShare = Math.floor(safeTotalXp / attributeIds.length);
  let remainder = safeTotalXp % attributeIds.length;

  return attributeIds.map((attributeId) => {
    const bonus = remainder > 0 ? 1 : 0;
    remainder -= bonus;

    return {
      attributeId,
      xp: baseShare + bonus,
    };
  });
}

export function buildDefaultAttributeWeights(attributeIds: ReadonlyArray<CategoryId>): AttributeWeight[] {
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

export function redistributeAttributeWeights(
  attributeIds: ReadonlyArray<CategoryId>,
  focusId?: CategoryId,
  focusWeight?: number,
): AttributeWeight[] {
  if (attributeIds.length === 0) {
    return [];
  }

  if (attributeIds.length === 1) {
    return [{ attributeId: attributeIds[0], weight: 100 }];
  }

  if (focusId) {
    const safeFocusWeight = Math.max(0, Math.min(100, Math.floor(Number(focusWeight) || 0)));
    const remaining = 100 - safeFocusWeight;
    const others = attributeIds.filter((id) => id !== focusId);
    const base = Math.floor(remaining / others.length);
    let remainder = remaining % others.length;

    return attributeIds.map((attributeId) => {
      if (attributeId === focusId) {
        return { attributeId, weight: safeFocusWeight };
      }

      const bonus = remainder > 0 ? 1 : 0;
      remainder -= bonus;
      return { attributeId, weight: base + bonus };
    });
  }

  const base = Math.floor(100 / attributeIds.length);
  let remainder = 100 % attributeIds.length;

  return attributeIds.map((attributeId) => {
    const bonus = remainder > 0 ? 1 : 0;
    remainder -= bonus;
    return { attributeId, weight: base + bonus };
  });
}

export function normalizeAttributeWeights(weights: ReadonlyArray<AttributeWeight>, attributeIds: ReadonlyArray<CategoryId>) {
  if (attributeIds.length === 0) {
    return [];
  }

  const allowed = new Set(attributeIds);
  const sanitized = weights
    .filter((weight) => allowed.has(weight.attributeId))
    .map((weight) => ({
      attributeId: weight.attributeId,
      weight: Math.max(0, Math.floor(Number(weight.weight) || 0)),
    }));

  if (sanitized.length === 0) {
    return buildDefaultAttributeWeights(attributeIds);
  }

  const weightMap = new Map(sanitized.map((weight) => [weight.attributeId, weight.weight]));
  const ordered = attributeIds.map((attributeId) => ({
    attributeId,
    weight: weightMap.get(attributeId) ?? 0,
  }));

  const total = ordered.reduce((sum, item) => sum + item.weight, 0);

  if (total === 100) {
    return ordered;
  }

  return buildDefaultAttributeWeights(attributeIds);
}

export function calculateQuestAttributeXP(
  totalXp: number,
  attributeWeights: ReadonlyArray<AttributeWeight>,
  attributeXPOverride?: ReadonlyArray<QuestAttributeXp>,
) {
  const safeTotalXp = Math.max(0, Math.floor(Number(totalXp) || 0));

  if (attributeXPOverride && attributeXPOverride.length > 0) {
    const allowed = new Set(attributeWeights.map((item) => item.attributeId));
    const sanitized = attributeXPOverride
      .filter((reward) => allowed.has(reward.attributeId))
      .map((reward) => ({
        attributeId: reward.attributeId,
        xp: Math.max(0, Math.floor(Number(reward.xp) || 0)),
      }));

    if (sanitized.length === 0) {
      return [];
    }

    const rewardMap = new Map(sanitized.map((reward) => [reward.attributeId, reward.xp]));
    const ordered = attributeWeights.map((item) => ({
      attributeId: item.attributeId,
      xp: rewardMap.get(item.attributeId) ?? 0,
    }));
    const total = ordered.reduce((sum, item) => sum + item.xp, 0);

    if (total === safeTotalXp) {
      return ordered;
    }

    return distributeXpByWeights(safeTotalXp, attributeWeights);
  }

  return distributeXpByWeights(safeTotalXp, attributeWeights);
}

function distributeXpByWeights(totalXp: number, attributeWeights: ReadonlyArray<AttributeWeight>) {
  if (attributeWeights.length === 0) {
    return [];
  }

  const safeWeights = normalizeAttributeWeights(attributeWeights, attributeWeights.map((item) => item.attributeId));
  const rawValues = safeWeights.map((weight) => ({
    attributeId: weight.attributeId,
    value: (totalXp * weight.weight) / 100,
  }));

  const baseValues = rawValues.map((item) => ({
    attributeId: item.attributeId,
    xp: Math.floor(item.value),
  }));
  let remainder = totalXp - baseValues.reduce((sum, item) => sum + item.xp, 0);

  return baseValues.map((item, index) => {
    const bonus = remainder > 0 ? 1 : 0;
    remainder -= bonus;
    return {
      attributeId: item.attributeId,
      xp: item.xp + bonus,
    };
  });
}
