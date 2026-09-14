import { describe, expect, it } from "vitest";
import { selectWidgetChecklistItems, WIDGET_CHECKLIST_VISIBLE_LIMIT } from "../current-quest-widget.utils";
import type { ChecklistItem } from "../../../../_lib/types/quest";

function item(id: string, tier: ChecklistItem["tier"], completed: boolean): ChecklistItem {
  return { id, title: id, completed, tier };
}

describe("selectWidgetChecklistItems", () => {
  it("shows every item unchanged when the checklist has 6 or fewer items", () => {
    const checklist = [item("a", "minimum", false), item("b", "minimum", true), item("c", "full", false)];

    const { visibleItems, hiddenCount } = selectWidgetChecklistItems(checklist);

    expect(visibleItems).toEqual(checklist);
    expect(hiddenCount).toBe(0);
  });

  it("shows exactly 6 items unchanged at the boundary", () => {
    const checklist = Array.from({ length: WIDGET_CHECKLIST_VISIBLE_LIMIT }, (_, i) => item(`i${i}`, "full", false));

    const { visibleItems, hiddenCount } = selectWidgetChecklistItems(checklist);

    expect(visibleItems).toHaveLength(6);
    expect(hiddenCount).toBe(0);
  });

  it("prioritizes incomplete Minimum items above everything else when truncating", () => {
    const checklist = [
      item("min-done-1", "minimum", true),
      item("min-open-1", "minimum", false),
      item("min-open-2", "minimum", false),
      item("full-open-1", "full", false),
      item("full-open-2", "full", false),
      item("full-open-3", "full", false),
      item("full-done-1", "full", true),
    ];

    const { visibleItems, hiddenCount } = selectWidgetChecklistItems(checklist);

    const visibleIds = visibleItems.map((i) => i.id);
    expect(visibleIds.slice(0, 2)).toEqual(["min-open-1", "min-open-2"]);
    expect(visibleItems).toHaveLength(6);
    expect(hiddenCount).toBe(1);
    // Completed Full items are the least urgent - the one hidden item here
    // is the completed Full one, never an incomplete Minimum item.
    expect(visibleIds).not.toContain("full-done-1");
  });

  it("shows ALL incomplete Minimum items even past the soft cap - never hides a Minimum Success gap", () => {
    const checklist = Array.from({ length: 8 }, (_, i) => item(`min-${i}`, "minimum", false));

    const { visibleItems, hiddenCount } = selectWidgetChecklistItems(checklist);

    expect(visibleItems).toHaveLength(8);
    expect(hiddenCount).toBe(0);
    expect(visibleItems.every((i) => i.tier === "minimum" && !i.completed)).toBe(true);
  });

  it("fills remaining space with completed Minimum items before incomplete Full items", () => {
    const checklist = [
      item("min-open-1", "minimum", false),
      item("min-done-1", "minimum", true),
      item("min-done-2", "minimum", true),
      item("full-open-1", "full", false),
      item("full-open-2", "full", false),
      item("full-open-3", "full", false),
      item("full-open-4", "full", false),
    ];

    const { visibleItems, hiddenCount } = selectWidgetChecklistItems(checklist);

    const visibleIds = visibleItems.map((i) => i.id);
    expect(visibleIds).toEqual(["min-open-1", "min-done-1", "min-done-2", "full-open-1", "full-open-2", "full-open-3"]);
    expect(hiddenCount).toBe(1);
  });

  it("reports zero hidden count when nothing needed to be trimmed", () => {
    const checklist: ChecklistItem[] = [];

    const { visibleItems, hiddenCount } = selectWidgetChecklistItems(checklist);

    expect(visibleItems).toEqual([]);
    expect(hiddenCount).toBe(0);
  });
});
