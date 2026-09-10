import type { ChecklistItem, ChecklistTier } from "../types/quest";

// Generic id generator, used both for ChecklistItem ids and
// ChecklistTemplate ids (QuestChecklistTab.tsx) - one small helper rather
// than a near-duplicate per entity.
export function generateChecklistId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "checklist-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export function createChecklistItem(title: string, tier: ChecklistTier): ChecklistItem {
  return { id: generateChecklistId(), title: title.trim(), completed: false, tier };
}

export type ChecklistProgress = Readonly<{
  minimumTotal: number;
  minimumCompleted: number;
  fullTotal: number;
  fullCompleted: number;
  // Reached only when there is at least one minimum-tier item and every one
  // of them is completed - never derived from a percentage, and a checklist
  // with zero minimum items is never silently treated as already reached.
  minimumSuccessReached: boolean;
  // Reached only when there is at least one item at all and every item
  // (both tiers combined) is completed.
  fullCompletionReached: boolean;
}>;

export function getChecklistProgress(checklist: ReadonlyArray<ChecklistItem> | undefined): ChecklistProgress {
  const items = checklist ?? [];
  const minimumItems = items.filter((item) => item.tier === "minimum");
  const minimumCompleted = minimumItems.filter((item) => item.completed).length;
  const fullCompleted = items.filter((item) => item.completed).length;

  return {
    minimumTotal: minimumItems.length,
    minimumCompleted,
    fullTotal: items.length,
    fullCompleted,
    minimumSuccessReached: minimumItems.length > 0 && minimumCompleted === minimumItems.length,
    fullCompletionReached: items.length > 0 && fullCompleted === items.length,
  };
}

// A purely derived, display-only label - never persisted, never affects the
// existing Quest.status model or completion/XP path. See the "Suggested
// state" note this mirrors: NOT_STARTED / IN_PROGRESS / MINIMUM_SUCCESS /
// COMPLETED, recomputed fresh from checklist items every render instead of
// being stored as redundant state that could drift.
export type ChecklistCompletionState = "not_started" | "in_progress" | "minimum_success" | "completed";

export function getChecklistCompletionState(progress: ChecklistProgress): ChecklistCompletionState {
  if (progress.fullTotal === 0) {
    return "not_started";
  }

  if (progress.fullCompletionReached) {
    return "completed";
  }

  if (progress.minimumSuccessReached) {
    return "minimum_success";
  }

  if (progress.fullCompleted > 0) {
    return "in_progress";
  }

  return "not_started";
}

// Moves (or reorders) a single checklist item to an exact position within a
// tier, preserving its id and completion state. Display always groups
// items by tier via a simple filter that preserves array order, so the one
// canonical persisted order is "every minimum-tier item in its chosen
// order, then every full-tier item in its chosen order" - callers never
// need to reason about interleaving the two tiers in the stored array.
export function moveChecklistItem(
  checklist: ReadonlyArray<ChecklistItem>,
  itemId: string,
  targetTier: ChecklistTier,
  targetIndexWithinTier: number,
): ChecklistItem[] {
  const moving = checklist.find((item) => item.id === itemId);

  if (!moving) {
    return [...checklist];
  }

  const withoutMoving = checklist.filter((item) => item.id !== itemId);
  const minimum = withoutMoving.filter((item) => item.tier === "minimum");
  const full = withoutMoving.filter((item) => item.tier === "full");
  const targetList = targetTier === "minimum" ? minimum : full;
  const clampedIndex = Math.max(0, Math.min(targetIndexWithinTier, targetList.length));

  targetList.splice(clampedIndex, 0, { ...moving, tier: targetTier });

  return [...minimum, ...full];
}
