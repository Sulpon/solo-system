import { updateGoalNode, normalizeGoalTree } from "../goal-tree-storage";
import {
  rebuildProposal,
  executeScheduleQuestAction,
  executeCreateQuestAction,
  executeCompleteOrLogAction,
  executeCreateNoteAction,
  executeUpdateGoalAction,
  type RebuildContext,
} from "./actions";
import type { Quest, QuestCompletion } from "../types/quest";
import type { GoalNode, GoalTree } from "../types/goal-tree";
import type { Category } from "../types/category";
import type { Note } from "../types/note";
import type { NoteDraft } from "../hooks/useNotes";
import type { JarvisActionProposal, JarvisActionResult, JarvisPlan, JarvisPlanStepOutcome } from "./types";

// Phase 16 Step "GENERATE PLAN" / sequential ACTION -> VERIFY loop. A plan
// is just an ordered list of the SAME action proposals Phase 15 already
// knows how to build/execute/verify - this file adds nothing new at the
// single-action level, it only sequences them safely:
//   - each step is REBUILT from its own sourceTool/sourceArgs against the
//     latest known state right before executing (stale-action protection,
//     also closes the gap Phase 15 never had for the single-action path -
//     see useJarvisConversation.ts's confirmAction)
//   - execution is strictly sequential, never parallel, so a later step
//     always sees the real effect of an earlier one
//   - a failed or stale step ABORTS all remaining steps (never continues
//     blind) - each skipped step is still reported, not silently dropped
//
// PLAN AUTONOMOUSLY. EXECUTE ONLY WITH EXPLICIT USER CONFIRMATION. VERIFY
// EVERYTHING. - this file only ever runs from the UI's single "Confirm
// Plan" click (JarvisPlanCard.tsx), exactly like a single action.

export function buildPlanFromProposals(proposals: ReadonlyArray<JarvisActionProposal>, title?: string): JarvisPlan {
  return {
    id: `plan:${Date.now()}`,
    title: title ?? `Plan (${proposals.length} steps)`,
    steps: proposals.map((proposal, index) => ({ id: `${proposal.id}:step${index}`, proposal })),
  };
}

export type PlanExecutionData = Readonly<{
  now: Date;
  quests: ReadonlyArray<Quest>;
  completions: ReadonlyArray<QuestCompletion>;
  goalTree: GoalTree;
  attributes: ReadonlyArray<Category>;
}>;

export type PlanExecutionSetters = Readonly<{
  setQuestDefinitions: (next: Quest[] | ((current: Quest[]) => Quest[])) => void;
  completeQuest: (questId: string) => boolean;
  addNote: (draft: NoteDraft) => Note;
  saveNode: (nodeId: string, updater: (current: GoalNode) => GoalNode) => void;
  updateProgressGoal: (nodeId: string, increment: number) => GoalTree;
}>;

export function executePlanSequentially(plan: JarvisPlan, initialData: PlanExecutionData, setters: PlanExecutionSetters): JarvisPlanStepOutcome[] {
  // Local, plan-scoped copies threaded between steps - React state setters
  // are async/batched, so a step executed a moment ago isn't yet visible
  // through the closure's original props; these copies are what the NEXT
  // step's rebuild/execution actually sees, while the real setters below
  // still perform genuine persistence at each step.
  let currentQuests: Quest[] = [...initialData.quests];
  let currentGoalTree = initialData.goalTree;
  const completedThisRun = new Set<string>();

  const outcomes: JarvisPlanStepOutcome[] = [];
  let aborted = false;

  for (const step of plan.steps) {
    if (aborted) {
      outcomes.push({ stepId: step.id, proposal: step.proposal, result: { ok: false, message: "Skipped - an earlier step in this plan failed or was no longer valid.", verified: [] }, skipped: true });
      continue;
    }

    const syntheticRecentCompletions: QuestCompletion[] = Array.from(completedThisRun).map((questId) => ({
      id: `plan-local:${questId}`,
      questId,
      completedAt: initialData.now.toISOString(),
      xpAwarded: 0,
      streakBonusXp: 0,
      attributeRewardsAwarded: [],
    }));
    const rebuildContext: RebuildContext = {
      now: initialData.now,
      quests: currentQuests,
      completions: [...initialData.completions, ...syntheticRecentCompletions],
      goalTree: currentGoalTree,
      attributes: initialData.attributes,
    };

    const revalidated = rebuildProposal(step.proposal.sourceTool, step.proposal.sourceArgs, rebuildContext);
    if (!revalidated) {
      outcomes.push({ stepId: step.id, proposal: step.proposal, result: { ok: false, message: `"${step.proposal.summary}" is no longer valid given the current state - skipped.`, verified: [] }, skipped: true });
      aborted = true;
      continue;
    }

    let result: JarvisActionResult;
    switch (revalidated.actionType) {
      case "schedule_quest":
        result = executeScheduleQuestAction(revalidated, currentQuests, (next) => {
          currentQuests = typeof next === "function" ? next(currentQuests) : next;
          setters.setQuestDefinitions(currentQuests);
        });
        break;
      case "create_quest":
        result = executeCreateQuestAction(revalidated, currentQuests, (next) => {
          currentQuests = typeof next === "function" ? next(currentQuests) : next;
          setters.setQuestDefinitions(currentQuests);
        });
        break;
      case "complete_quest":
      case "log_habit":
        result = executeCompleteOrLogAction(revalidated, currentQuests, (questId) => {
          const success = setters.completeQuest(questId);
          if (success) completedThisRun.add(questId);
          return success;
        });
        break;
      case "create_note":
        result = executeCreateNoteAction(revalidated, setters.addNote);
        break;
      case "update_goal":
        result = executeUpdateGoalAction(
          revalidated,
          currentGoalTree,
          (nodeId, increment) => {
            const updatedTree = setters.updateProgressGoal(nodeId, increment);
            currentGoalTree = updatedTree;
            return updatedTree;
          },
          (nodeId, updater) => {
            currentGoalTree = normalizeGoalTree(updateGoalNode(currentGoalTree, nodeId, updater));
            setters.saveNode(nodeId, updater);
          },
        );
        break;
    }

    outcomes.push({ stepId: step.id, proposal: revalidated, result, skipped: false });
    if (!result.ok) aborted = true;
  }

  return outcomes;
}
