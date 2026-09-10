import { hasCompletedToday } from "../quest-storage";
import { getChecklistProgress } from "./checklist-engine";
import { EISENHOWER_QUADRANTS } from "../types/quest";
import type { EisenhowerQuadrant, Quest, QuestCompletion } from "../types/quest";
import type { DailyPlan, DailyPlanTaskAssignment } from "../types/daily-plan";

// The single unlock condition for the Priority Gate - reuses the exact
// checklist-engine derivation (never a second completion calculation).
// A Task with no checklist falls back to the existing Quest completion
// semantics as its Minimum Success equivalent - completed today == reached.
export function isTaskMinimumSuccessReached(quest: Quest, completions: ReadonlyArray<QuestCompletion>, referenceDate: Date = new Date()): boolean {
  const mode = quest.checklistMode ?? "none";

  if (mode === "none") {
    return hasCompletedToday(quest.id, completions, referenceDate);
  }

  return getChecklistProgress(quest.checklist).minimumSuccessReached;
}

// What quadrant each planned Task belongs to, for a given day. If the plan
// is locked, this is the frozen snapshot (filtered to Tasks that still
// exist) - a later reclassification of the Quest elsewhere does not drift
// an already-locked day. If unlocked (including "no plan exists at all" -
// the graceful no-evening-planning fallback), this is derived live from
// every active Task's current eisenhowerQuadrant, exactly like the
// existing Eisenhower board.
export function resolvePlanAssignments(plan: DailyPlan | undefined, tasks: ReadonlyArray<Quest>): DailyPlanTaskAssignment[] {
  if (plan?.locked) {
    const validTaskIds = new Set(tasks.map((task) => task.id));
    return plan.assignments.filter((assignment) => validTaskIds.has(assignment.questId));
  }

  return tasks.filter((task) => task.eisenhowerQuadrant).map((task) => ({ questId: task.id, quadrant: task.eisenhowerQuadrant as EisenhowerQuadrant }));
}

export function groupAssignmentsByQuadrant(assignments: ReadonlyArray<DailyPlanTaskAssignment>, tasks: ReadonlyArray<Quest>): Record<EisenhowerQuadrant, Quest[]> {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const groups = Object.fromEntries(EISENHOWER_QUADRANTS.map((quadrant) => [quadrant, [] as Quest[]])) as Record<EisenhowerQuadrant, Quest[]>;

  for (const assignment of assignments) {
    const task = taskById.get(assignment.questId);

    if (task) {
      groups[assignment.quadrant].push(task);
    }
  }

  return groups;
}

export type QuadrantGateStatus = Readonly<{
  quadrant: EisenhowerQuadrant;
  tasks: ReadonlyArray<Quest>;
  // True when every Task in this quadrant has reached Minimum Success - a
  // quadrant with zero Tasks is vacuously cleared (Array.every on an empty
  // array is true), which is exactly "empty quadrants auto-clear."
  cleared: boolean;
}>;

export type PriorityGateState = Readonly<{
  // Always in Q1 -> Q3 -> Q2 -> Q4 order (EISENHOWER_QUADRANTS' own order).
  quadrantStatuses: ReadonlyArray<QuadrantGateStatus>;
  // The first not-yet-cleared quadrant, in progression order - null once
  // every quadrant is cleared ("all caught up").
  currentQuadrant: EisenhowerQuadrant | null;
}>;

// The one function that decides "what's the current priority today" -
// derives everything fresh from live Quest/completion state every call, no
// separate "Q1 unlocked" flag is ever persisted.
export function computePriorityGateState(
  tasksByQuadrant: Record<EisenhowerQuadrant, ReadonlyArray<Quest>>,
  completions: ReadonlyArray<QuestCompletion>,
  referenceDate: Date = new Date(),
): PriorityGateState {
  let currentQuadrant: EisenhowerQuadrant | null = null;

  const quadrantStatuses = EISENHOWER_QUADRANTS.map((quadrant) => {
    const tasks = tasksByQuadrant[quadrant] ?? [];
    const cleared = tasks.every((task) => isTaskMinimumSuccessReached(task, completions, referenceDate));

    if (currentQuadrant === null && !cleared) {
      currentQuadrant = quadrant;
    }

    return { quadrant, tasks, cleared };
  });

  return { quadrantStatuses, currentQuadrant };
}
