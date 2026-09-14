import type { ChecklistItem } from "../../../_lib/types/quest";

// Keeps the floating Current Quest widget compact - see the display rule
// this implements: a checklist of 6 items or fewer is shown in full (in its
// existing minimum-then-full stored order, same as checklist-engine's
// canonical order); a longer checklist is trimmed by priority instead of
// just truncating the raw list, so the items that matter most for Minimum
// Success are never the ones silently hidden.
export const WIDGET_CHECKLIST_VISIBLE_LIMIT = 6;

export type WidgetChecklistDisplay = Readonly<{
  visibleItems: ReadonlyArray<ChecklistItem>;
  hiddenCount: number;
}>;

export function selectWidgetChecklistItems(checklist: ReadonlyArray<ChecklistItem>): WidgetChecklistDisplay {
  if (checklist.length <= WIDGET_CHECKLIST_VISIBLE_LIMIT) {
    return { visibleItems: checklist, hiddenCount: 0 };
  }

  // Priority order: every incomplete Minimum item is always shown (even past
  // the soft cap - these are exactly what Minimum Success is gating on, so
  // they're never the ones that get hidden), then completed Minimum items
  // fill remaining space, then incomplete Full items. Completed Full items
  // are the least urgent thing in a compact widget and are only ever shown
  // when the list isn't truncated at all (the <=6 branch above).
  const minimumIncomplete = checklist.filter((item) => item.tier === "minimum" && !item.completed);
  const minimumComplete = checklist.filter((item) => item.tier === "minimum" && item.completed);
  const fullIncomplete = checklist.filter((item) => item.tier === "full" && !item.completed);

  const visibleItems: ChecklistItem[] = [...minimumIncomplete];

  for (const item of minimumComplete) {
    if (visibleItems.length >= WIDGET_CHECKLIST_VISIBLE_LIMIT) break;
    visibleItems.push(item);
  }

  for (const item of fullIncomplete) {
    if (visibleItems.length >= WIDGET_CHECKLIST_VISIBLE_LIMIT) break;
    visibleItems.push(item);
  }

  return { visibleItems, hiddenCount: checklist.length - visibleItems.length };
}
