import { describe, expect, it } from "vitest";
import { describeAttributeImpact, removeAttribute, summariseAttributeImpact } from "../attribute-removal-engine";
import type { Category } from "../../types/category";
import type { GoalTree } from "../../types/goal-tree";
import type { Quest } from "../../types/quest";

const ATTRIBUTES = [
  { id: "discipline", name: "Discipline", icon: "D", accent: "bg-purple-500" },
  { id: "creativity", name: "Creativity", icon: "C", accent: "bg-fuchsia-400" },
] as unknown as Category[];

function quest(id: string, categoryId: string, rewards: ReadonlyArray<string> = []): Quest {
  return {
    id,
    title: id,
    categoryId,
    xp: 10,
    attributeXPOverride: rewards.map((attributeId) => ({ attributeId, xp: 5 })),
  } as unknown as Quest;
}

function node(id: string, attributes: string[] = [], weighted: string[] = [], children: GoalTree = []): GoalTree[number] {
  return {
    id,
    title: id,
    type: "long_term_goal",
    attributes,
    attributeWeights: weighted.map((attributeId) => ({ attributeId, weight: 1 })),
    children,
    updatedAt: "2026-10-24T00:00:00.000Z",
  } as unknown as GoalTree[number];
}

describe("summariseAttributeImpact", () => {
  it("counts quests filed under the attribute", () => {
    const quests = [quest("q1", "creativity"), quest("q2", "creativity"), quest("q3", "discipline")];

    expect(summariseAttributeImpact("creativity", quests, [], 2).questCount).toBe(2);
  });

  it("counts goals that reference it, including collapsed descendants", () => {
    const tree: GoalTree = [node("root", ["discipline"], [], [node("child", ["creativity"]), node("grandchild-holder", [], [], [node("deep", ["creativity"])])])];

    expect(summariseAttributeImpact("creativity", [], tree, 2).goalCount).toBe(2);
  });

  it("counts a goal that references it only through a weighted split", () => {
    const tree: GoalTree = [node("root", [], ["creativity"])];

    expect(summariseAttributeImpact("creativity", [], tree, 2).goalCount).toBe(1);
  });

  it("does not double-count a goal that references it both ways", () => {
    const tree: GoalTree = [node("root", ["creativity"], ["creativity"])];

    expect(summariseAttributeImpact("creativity", [], tree, 2).goalCount).toBe(1);
  });

  it("counts quests that award XP to it without being filed under it", () => {
    const quests = [quest("q1", "discipline", ["creativity"]), quest("q2", "creativity", ["creativity"])];
    const impact = summariseAttributeImpact("creativity", quests, [], 2);

    // q2 is already counted as a filed quest - not again here.
    expect(impact.rewardReferenceCount).toBe(1);
    expect(impact.questCount).toBe(1);
  });

  it("reports nothing referencing an unused attribute", () => {
    const impact = summariseAttributeImpact("creativity", [quest("q1", "discipline")], [node("root", ["discipline"])], 2);

    expect(impact.hasReferences).toBe(false);
  });

  it("flags the last remaining attribute, which must not be removable", () => {
    expect(summariseAttributeImpact("discipline", [], [], 1).isLastAttribute).toBe(true);
    expect(summariseAttributeImpact("discipline", [], [], 2).isLastAttribute).toBe(false);
  });

  it("tolerates goals with no attribute fields at all", () => {
    const bare = { id: "n", title: "n", type: "dream", children: [] } as unknown as GoalTree[number];

    expect(() => summariseAttributeImpact("creativity", [], [bare], 2)).not.toThrow();
    expect(summariseAttributeImpact("creativity", [], [bare], 2).goalCount).toBe(0);
  });
});

describe("removeAttribute", () => {
  it("removes only the named attribute", () => {
    expect(removeAttribute(ATTRIBUTES, "creativity").map((attribute) => attribute.id)).toEqual(["discipline"]);
  });

  it("never deletes quests or goals - it returns attributes only", () => {
    // The guarantee the UI promises: this function cannot touch anything
    // but the attribute list.
    expect(removeAttribute(ATTRIBUTES, "creativity")).toHaveLength(1);
  });

  it("is a no-op for an id that is not present", () => {
    expect(removeAttribute(ATTRIBUTES, "nope")).toHaveLength(2);
  });
});

describe("describeAttributeImpact", () => {
  it("says plainly when nothing references the attribute", () => {
    expect(describeAttributeImpact(summariseAttributeImpact("creativity", [], [], 2))).toContain("Nothing references");
  });

  it("names real counts and promises the records are kept", () => {
    const impact = summariseAttributeImpact("creativity", [quest("q1", "creativity")], [node("root", ["creativity"])], 2);
    const message = describeAttributeImpact(impact);

    expect(message).toContain("1 quest");
    expect(message).toContain("1 goal");
    expect(message).toContain("will be kept");
  });

  it("pluralises correctly", () => {
    const impact = summariseAttributeImpact("creativity", [quest("q1", "creativity"), quest("q2", "creativity")], [], 2);

    expect(describeAttributeImpact(impact)).toContain("2 quests");
  });

  it("agrees the verb with the real total, not the number of clauses", () => {
    const one = summariseAttributeImpact("creativity", [quest("q1", "creativity")], [], 2);
    expect(describeAttributeImpact(one)).toContain("1 quest still references");
    expect(describeAttributeImpact(one)).toContain("It will be kept");

    const several = summariseAttributeImpact("creativity", [quest("q1", "creativity")], [node("root", ["creativity"])], 2);
    expect(describeAttributeImpact(several)).toContain("still reference this");
    expect(describeAttributeImpact(several)).toContain("They will be kept");
  });
});
