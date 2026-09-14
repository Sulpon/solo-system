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
import { executeOpenApplicationAction } from "./os-actions";
import type { Quest, QuestCompletion } from "../types/quest";
import type { GoalNode, GoalTree } from "../types/goal-tree";
import type { Category } from "../types/category";
import type { Note } from "../types/note";
import type { NoteDraft } from "../hooks/useNotes";
import type { JarvisActionProposal, JarvisActionResult, JarvisEntityReference, JarvisPlan, JarvisPlanStatus, JarvisPlanStep, JarvisPlanStepStatus } from "./types";

// Phase 16's "GENERATE PLAN" / sequential ACTION -> VERIFY loop, upgraded by
// Phase 18 into a PERSISTENT, dependency-aware plan engine. A plan is still
// just an ordered list of the SAME action proposals Phase 15 already knows
// how to build/execute/verify - this file adds:
//   - a real dependency graph, derived deterministically from `refs` a
//     propose_* call carries (see actions.ts) - NOT an implicit "everything
//     before me" chain. A step with no refs has no dependencies and is
//     READY immediately, independent of its siblings (Phase 16's old
//     "abort every remaining step on any failure" is gone - only a step's
//     OWN dependents are ever blocked by its failure).
//   - deterministic entity-reference resolution (resolveStepArgs), so a
//     later step can target the exact entity id an earlier step's real,
//     verified mutation produced - never a title guess, never LLM-evaluated
//     code.
//   - plan/step status as pure, re-derivable state (deriveStepStatuses/
//     derivePlanStatus) - Atlas owns this state; nothing here is inferred
//     from conversation history.
//
// PLAN AUTONOMOUSLY. EXECUTE ONLY WITH EXPLICIT USER CONTROL. VERIFY
// EVERYTHING. Every mutation is still revalidated against CURRENT Atlas
// state (rebuildProposal) immediately before it runs - a step's proposal,
// however it reached "ready," is never trusted merely because it once
// looked valid.

function generateId(prefix: string): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? `${prefix}:${crypto.randomUUID()}` : `${prefix}:${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ---- Build (Section 2/3/4) --------------------------------------------------

export type BuildPlanMeta = Readonly<{ title?: string; objective?: string; rationale?: string; tradeoffs?: string; horizon?: string; source?: string }>;

// Derives each step's dependency edge(s) and entity reference(s) from its
// OWN proposal.sourceArgs.refs - a plain { argName: 1-based position among
// this same batch of proposals } map the LLM supplied when a value refers
// to something an earlier propose_* call in the SAME turn will create (see
// actions.ts's REFS_SCHEMA_PROPERTY). Never a free-form graph the LLM
// declares directly - Atlas computes the edges, from a narrow, typed input.
function deriveDependencies(proposals: ReadonlyArray<JarvisActionProposal>, stepIds: ReadonlyArray<string>): ReadonlyArray<{ dependencies: ReadonlyArray<string>; entityRefs: Readonly<Record<string, JarvisEntityReference>> | undefined }> {
  return proposals.map((proposal, index) => {
    const refs = (proposal.sourceArgs as Readonly<{ refs?: unknown }>).refs;
    if (!refs || typeof refs !== "object") return { dependencies: [], entityRefs: undefined };

    const dependencies: string[] = [];
    const entityRefs: Record<string, JarvisEntityReference> = {};
    for (const [field, position] of Object.entries(refs as Record<string, unknown>)) {
      if (typeof position !== "number") continue;
      const sourceIndex = Math.trunc(position) - 1;
      // Never self-reference, never point outside this batch - an
      // out-of-range or self-referencing position is simply ignored (the
      // step keeps whatever literal idOrTitle it was given, which will
      // fail its own normal lookup honestly rather than resolve to the
      // wrong entity).
      if (sourceIndex < 0 || sourceIndex >= stepIds.length || sourceIndex === index) continue;
      const sourceStepId = stepIds[sourceIndex];
      dependencies.push(sourceStepId);
      entityRefs[field] = { sourceStepId, field: "entityId" };
    }
    return { dependencies, entityRefs: Object.keys(entityRefs).length > 0 ? entityRefs : undefined };
  });
}

export function buildPlanFromProposals(proposals: ReadonlyArray<JarvisActionProposal>, meta?: BuildPlanMeta): JarvisPlan {
  const now = new Date().toISOString();
  const stepIds = proposals.map((proposal, index) => `${proposal.id}:step${index}`);
  const derived = deriveDependencies(proposals, stepIds);

  const steps: JarvisPlanStep[] = proposals.map((proposal, index) => ({
    id: stepIds[index],
    proposal,
    status: "pending",
    dependencies: derived[index].dependencies,
    entityRefs: derived[index].entityRefs,
    createdAt: now,
    updatedAt: now,
  }));

  return {
    id: generateId("plan"),
    title: meta?.title ?? `Plan (${proposals.length} step${proposals.length === 1 ? "" : "s"})`,
    objective: meta?.objective ?? "",
    createdAt: now,
    updatedAt: now,
    status: "proposed",
    steps: deriveStepStatuses(steps),
    rationale: meta?.rationale,
    tradeoffs: meta?.tradeoffs,
    horizon: meta?.horizon,
    source: meta?.source,
  };
}

// ---- Pure status derivation (Section 3/15) ---------------------------------
//
// READY: every dependency step has status "completed" (vacuously true for
// no dependencies). BLOCKED: otherwise - a pending/executing/failed/skipped
// dependency all count as "not yet safely usable," exactly per spec. A
// step's own terminal/in-flight status (executing/completed/failed/skipped)
// is never overwritten here - only "pending"/"blocked" are re-derived.
export function deriveStepStatuses(steps: ReadonlyArray<JarvisPlanStep>): JarvisPlanStep[] {
  const byId = new Map(steps.map((step) => [step.id, step]));
  return steps.map((step) => {
    if (step.status !== "pending" && step.status !== "blocked") return step;
    const allDependenciesCompleted = step.dependencies.every((depId) => byId.get(depId)?.status === "completed");
    const nextStatus: JarvisPlanStepStatus = allDependenciesCompleted ? "ready" : "blocked";
    if (nextStatus === step.status) return step;
    return { ...step, status: nextStatus, updatedAt: new Date().toISOString() };
  });
}

// A plan's status is mostly derived from its steps, except the three
// explicitly user-driven states (proposed/paused/cancelled) which always
// win - Atlas never silently moves a plan out of a state the user (or the
// initial proposal) put it in.
export function derivePlanStatus(plan: JarvisPlan): JarvisPlanStatus {
  if (plan.status === "cancelled") return "cancelled";
  if (plan.status === "proposed") return "proposed";
  if (plan.status === "paused") return "paused";

  const allSettled = plan.steps.every((step) => step.status === "completed" || step.status === "skipped");
  if (allSettled) return plan.steps.some((step) => step.status === "completed") || plan.steps.length === 0 ? "completed" : "failed";

  const hasActionable = plan.steps.some((step) => step.status === "ready" || step.status === "pending" || step.status === "executing");
  return hasActionable ? "active" : "failed";
}

export function remainingSteps(plan: JarvisPlan): ReadonlyArray<JarvisPlanStep> {
  return plan.steps.filter((step) => step.status !== "completed" && step.status !== "skipped");
}

export function nextReadyStep(plan: JarvisPlan): JarvisPlanStep | null {
  return plan.steps.find((step) => step.status === "ready") ?? null;
}

// ---- Entity-reference resolution (Section 4) -------------------------------

type ResolvedArgs = Readonly<{ ok: true; args: Readonly<Record<string, unknown>> }> | Readonly<{ ok: false; reason: string }>;

// Deterministic, explicit, never-silent: every entityRef on this step must
// resolve to a COMPLETED source step that actually produced an entity id
// (see JarvisActionResult.producedEntityId) - a schedule/complete/update
// step never produces one, so referencing one is rejected here, not
// silently matched to the wrong thing.
function resolveStepArgs(step: JarvisPlanStep, allSteps: ReadonlyArray<JarvisPlanStep>): ResolvedArgs {
  if (!step.entityRefs) return { ok: true, args: step.proposal.sourceArgs };

  const args: Record<string, unknown> = { ...step.proposal.sourceArgs };
  for (const [field, ref] of Object.entries(step.entityRefs)) {
    const sourceStep = allSteps.find((candidate) => candidate.id === ref.sourceStepId);
    const producedEntityId = sourceStep?.status === "completed" ? sourceStep.result?.producedEntityId : undefined;
    if (!sourceStep || !producedEntityId) {
      const label = sourceStep?.proposal.summary ?? ref.sourceStepId;
      return { ok: false, reason: `Cannot resolve "${field}" from step "${label}" - it did not produce a usable entity.` };
    }
    args[field] = producedEntityId;
  }
  return { ok: true, args };
}

// ---- Execution (Section 3/5/10/11) -----------------------------------------

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

// Phase 19: async only because open_application's native launch is
// inherently async (a Tauri IPC round-trip) - every Atlas (data) action
// stays perfectly synchronous internally, this just lets both kinds share
// one dispatcher and one await point in executeReadySteps below.
async function executeOneAction(
  proposal: JarvisActionProposal,
  currentQuestsRef: { current: Quest[] },
  currentGoalTreeRef: { current: GoalTree },
  completedThisRun: Set<string>,
  setters: PlanExecutionSetters,
): Promise<JarvisActionResult> {
  switch (proposal.actionType) {
    case "schedule_quest":
      return executeScheduleQuestAction(proposal, currentQuestsRef.current, (next) => {
        currentQuestsRef.current = typeof next === "function" ? next(currentQuestsRef.current) : next;
        setters.setQuestDefinitions(currentQuestsRef.current);
      });
    case "create_quest":
      return executeCreateQuestAction(proposal, currentQuestsRef.current, (next) => {
        currentQuestsRef.current = typeof next === "function" ? next(currentQuestsRef.current) : next;
        setters.setQuestDefinitions(currentQuestsRef.current);
      });
    case "complete_quest":
    case "log_habit":
      return executeCompleteOrLogAction(proposal, currentQuestsRef.current, (questId) => {
        const success = setters.completeQuest(questId);
        if (success) completedThisRun.add(questId);
        return success;
      });
    case "create_note":
      return executeCreateNoteAction(proposal, setters.addNote);
    case "update_goal":
      return executeUpdateGoalAction(
        proposal,
        currentGoalTreeRef.current,
        (nodeId, increment) => {
          const updatedTree = setters.updateProgressGoal(nodeId, increment);
          currentGoalTreeRef.current = updatedTree;
          return updatedTree;
        },
        (nodeId, updater) => {
          currentGoalTreeRef.current = normalizeGoalTree(updateGoalNode(currentGoalTreeRef.current, nodeId, updater));
          setters.saveNode(nodeId, updater);
        },
      );
    case "open_application":
      return executeOpenApplicationAction(proposal);
  }
}

// Runs every step that is READY *right now* - exactly one batch, never
// cascading into steps a completion in THIS batch only just unblocked
// (those are re-derived to READY for display, but stay for the user's
// NEXT explicit "Execute Ready Step(s)" click - Section 11's manual
// control: each click is one deliberate, visible batch of mutations, not
// an invisible chain reaction). Never executes a step that isn't
// currently ready, and never lets one step's failure stop an unrelated,
// still-ready sibling (Section 10). Safe to call repeatedly (Section 11's
// "Execute ready step(s)" / "Continue plan" controls reuse this exact
// function) - a plan with nothing ready is simply returned unchanged
// besides its derived `status`.
export async function executeReadySteps(plan: JarvisPlan, data: PlanExecutionData, setters: PlanExecutionSetters): Promise<JarvisPlan> {
  if (plan.status !== "active" && plan.status !== "proposed") return plan;

  let steps: JarvisPlanStep[] = [...plan.steps];
  const currentQuestsRef = { current: [...data.quests] };
  const currentGoalTreeRef = { current: data.goalTree };
  const completedThisRun = new Set<string>();

  const readyIds = steps.filter((step) => step.status === "ready").map((step) => step.id);

  for (const stepId of readyIds) {
    const index = steps.findIndex((step) => step.id === stepId);
    const step = steps[index];
    const now = new Date().toISOString();

    const resolution = resolveStepArgs(step, steps);
    if (!resolution.ok) {
      steps[index] = { ...step, status: "failed", failureReason: resolution.reason, updatedAt: now };
      continue;
    }

    const syntheticCompletions: QuestCompletion[] = Array.from(completedThisRun).map((questId) => ({
      id: `plan-local:${questId}`,
      questId,
      completedAt: data.now.toISOString(),
      xpAwarded: 0,
      streakBonusXp: 0,
      attributeRewardsAwarded: [],
    }));
    const rebuildContext: RebuildContext = {
      now: data.now,
      quests: currentQuestsRef.current,
      completions: [...data.completions, ...syntheticCompletions],
      goalTree: currentGoalTreeRef.current,
      attributes: data.attributes,
    };

    const revalidated = rebuildProposal(step.proposal.sourceTool, resolution.args, rebuildContext);
    if (!revalidated) {
      steps[index] = { ...step, status: "failed", failureReason: `"${step.proposal.summary}" is no longer valid given the current Atlas state.`, updatedAt: now };
      continue;
    }

    const result = await executeOneAction(revalidated, currentQuestsRef, currentGoalTreeRef, completedThisRun, setters);
    steps[index] = {
      ...step,
      proposal: revalidated,
      status: result.ok ? "completed" : "failed",
      result,
      failureReason: result.ok ? undefined : result.message,
      completedAt: result.ok ? now : undefined,
      updatedAt: now,
    };
  }

  steps = deriveStepStatuses(steps);

  const settled: JarvisPlan = { ...plan, steps, status: plan.status === "proposed" ? "active" : plan.status, updatedAt: new Date().toISOString() };
  return { ...settled, status: derivePlanStatus(settled) };
}

// ---- Manual control (Section 11) -------------------------------------------
//
// Every transition below is a pure, explicit function driven ONLY by a real
// user action (see useJarvisConversation.ts) - none of them execute
// anything by themselves.

export function confirmPlan(plan: JarvisPlan): JarvisPlan {
  if (plan.status !== "proposed") return plan;
  return { ...plan, status: "active", updatedAt: new Date().toISOString() };
}

export function pausePlan(plan: JarvisPlan): JarvisPlan {
  if (plan.status !== "active") return plan;
  return { ...plan, status: "paused", updatedAt: new Date().toISOString() };
}

export function continuePlan(plan: JarvisPlan): JarvisPlan {
  if (plan.status !== "paused") return plan;
  return { ...plan, status: "active", updatedAt: new Date().toISOString() };
}

// Cancelling finalizes every step that will now never run as "skipped" -
// distinct from "failed" (an attempted, unsuccessful mutation) and from
// "blocked" (still theoretically resumable) - a cancelled plan's steps are
// permanently done being tracked as live work.
export function cancelPlan(plan: JarvisPlan): JarvisPlan {
  if (plan.status === "cancelled" || plan.status === "completed" || plan.status === "failed") return plan;
  const now = new Date().toISOString();
  const steps = plan.steps.map((step) => (step.status === "completed" || step.status === "skipped" ? step : { ...step, status: "skipped" as const, updatedAt: now }));
  return { ...plan, steps, status: "cancelled", updatedAt: now };
}
