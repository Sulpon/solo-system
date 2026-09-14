import { applyQuestSchedule } from "../engines/quest-calendar-engine";
import { flattenGoalTree, updateGoalNode, normalizeGoalTree } from "../goal-tree-storage";
import { createQuestFormModel, upsertQuestFromForm } from "../../_components/quests/quest-form.utils";
import { getLocalDayKey } from "../local-day";
import { buildOpenApplicationProposal } from "./os-actions";
import type { Quest, QuestCompletion } from "../types/quest";
import type { GoalNode, GoalTree } from "../types/goal-tree";
import type { Category } from "../types/category";
import type { Note } from "../types/note";
import type { NoteDraft } from "../hooks/useNotes";
import type { LLMToolDefinition, JarvisActionProposal, JarvisActionResult, JarvisActionPreviewField } from "./types";

// Phase 15 - Atlas actions. The model may PROPOSE a mutation via a tool
// call, but a proposal is only ever a plain data object rendered as a
// [CONFIRM]/[CANCEL] card with a full before/after PREVIEW
// (JarvisActionConfirmCard.tsx) - nothing executes until the user
// explicitly confirms. Execution always reuses an EXISTING, already-proven
// Atlas mutation path (see the comment above each execute* function for
// exactly which one), never a duplicate mutation implementation. After
// executing, every action computes a VERIFIED result from the real
// returned/produced data - never assumed from the proposal alone - and
// that verified result (not the original proposal) is what gets reported
// back to the conversation.
//
// Six action types are wired end-to-end this phase: schedule_quest (Phase
// 14), create_quest, complete_quest, log_habit, create_note, update_goal -
// the exact set Phase 14 named as "future candidates." Each stays narrowly
// scoped to what can be safely automated without a UI modal (see
// complete_quest/log_habit's goal-linked-quest guard below) - anything
// requiring interactive input (a numeric progress value, a checklist) is
// declined with an honest message, not silently approximated.

function findQuestByIdOrTitle(idOrTitle: string | undefined, quests: ReadonlyArray<Quest>): Quest | null {
  if (!idOrTitle) return null;
  return quests.find((quest) => quest.id === idOrTitle) ?? quests.find((quest) => quest.title.toLowerCase().includes(idOrTitle.toLowerCase())) ?? null;
}

function findGoalByIdOrTitle(idOrTitle: string | undefined, flatGoals: ReadonlyArray<GoalNode>): GoalNode | null {
  if (!idOrTitle) return null;
  return flatGoals.find((node) => node.id === idOrTitle) ?? flatGoals.find((node) => node.title.toLowerCase().includes(idOrTitle.toLowerCase())) ?? null;
}

// Phase 18 - true only when the LLM marked idOrTitle as referring to an
// entity a PRIOR step in the same plan will create (see REFS_SCHEMA_PROPERTY
// above). When true, idOrTitle legitimately can't resolve YET (the entity
// doesn't exist in Atlas until that earlier step actually runs) - the
// build* function below builds a PLACEHOLDER proposal instead of failing,
// and the real proposal is rebuilt with the real resolved id right before
// execution (see plan-engine.ts's resolveStepArgs + rebuildProposal).
function hasIdOrTitleRef(args: Readonly<{ refs?: unknown }>): boolean {
  const refs = args.refs as Readonly<{ idOrTitle?: unknown }> | undefined;
  return typeof refs?.idOrTitle === "number";
}

// Phase 18 - the entity-threading argument shared by every tool below that
// targets an existing entity by idOrTitle. Use ONLY when that target is an
// entity a PRIOR propose_* call IN THIS SAME RESPONSE will create (it does
// not exist in Atlas yet, so idOrTitle can't resolve it) - map the argument
// name to the 1-based position of that earlier call among this response's
// propose_* calls, e.g. `refs: { idOrTitle: 1 }`. Atlas resolves this to
// the real created entity's id right before executing that step - it is
// never evaluated as code or a free-form expression.
const REFS_SCHEMA_PROPERTY = {
  refs: {
    type: "object",
    description:
      "Optional. Use ONLY when idOrTitle names an entity that an EARLIER propose_* call in this same response will create (it doesn't exist in Atlas yet). Map { idOrTitle: <1-based position of that earlier call among this response's propose_* calls> }.",
    properties: { idOrTitle: { type: "number" } },
  },
} as const;

export const JARVIS_ACTION_TOOLS: ReadonlyArray<LLMToolDefinition> = [
  {
    name: "propose_schedule_quest",
    description: "Propose scheduling a real, existing Quest at a specific date/time. Never executes by itself - only creates a proposal the user must explicitly confirm.",
    inputSchema: {
      type: "object",
      properties: {
        idOrTitle: { type: "string", description: "The Quest's id or title" },
        scheduledDate: { type: "string", description: "YYYY-MM-DD" },
        scheduledStartTime: { type: "string", description: "HH:MM 24h, optional" },
        scheduledEndTime: { type: "string", description: "HH:MM 24h, optional" },
        ...REFS_SCHEMA_PROPERTY,
      },
      required: ["idOrTitle", "scheduledDate"],
    },
  },
  {
    name: "propose_create_quest",
    description: "Propose creating a brand-new Quest. Must use a real, existing Skill (categoryId) the user already tracks - never invents one. Never executes by itself.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        categoryId: { type: "string", description: "An existing Skill's id or name" },
        kind: { type: "string", enum: ["task", "habit"] },
        xp: { type: "number" },
        cadence: { type: "string", enum: ["daily", "weekly", "one-time"] },
      },
      required: ["title", "categoryId"],
    },
  },
  {
    name: "propose_complete_quest",
    description: "Propose marking a real, existing Task Quest complete for today. Never executes by itself. Only works for plain Quests with no linked Goal (those require interactive input Atlas cannot collect here).",
    inputSchema: { type: "object", properties: { idOrTitle: { type: "string" }, ...REFS_SCHEMA_PROPERTY }, required: ["idOrTitle"] },
  },
  {
    name: "propose_log_habit",
    description: "Propose logging a real, existing Habit Quest as done for today. Never executes by itself. Only works for plain Habits with no linked Goal.",
    inputSchema: { type: "object", properties: { idOrTitle: { type: "string" }, ...REFS_SCHEMA_PROPERTY }, required: ["idOrTitle"] },
  },
  {
    name: "propose_create_note",
    description: "Propose creating a new Note with a title and content. Never executes by itself.",
    inputSchema: { type: "object", properties: { title: { type: "string" }, content: { type: "string" } }, required: ["title", "content"] },
  },
  {
    name: "propose_update_goal",
    description: "Propose updating a real, existing Goal - either incrementing a Progress Goal's current value (progressDelta), or changing its status. Never executes by itself.",
    inputSchema: {
      type: "object",
      properties: {
        idOrTitle: { type: "string" },
        progressDelta: { type: "number", description: "Amount to add to a progress_goal's current value" },
        status: { type: "string", enum: ["not_started", "in_progress", "completed"] },
        ...REFS_SCHEMA_PROPERTY,
      },
      required: ["idOrTitle"],
    },
  },
];

// ---- schedule_quest -----------------------------------------------------

export type ScheduleQuestPayload = Readonly<{ questId: string; scheduledDate: string; scheduledStartTime?: string; scheduledEndTime?: string }>;

export function buildScheduleQuestProposal(
  args: Readonly<{ idOrTitle?: string; scheduledDate?: string; scheduledStartTime?: string; scheduledEndTime?: string; refs?: unknown }>,
  quests: ReadonlyArray<Quest>,
): JarvisActionProposal | null {
  if (!args.scheduledDate) return null;
  const quest = findQuestByIdOrTitle(args.idOrTitle, quests);
  if (!quest) {
    if (!hasIdOrTitleRef(args)) return null;
    const timeLabel = args.scheduledStartTime ? ` at ${args.scheduledStartTime}` : "";
    return {
      id: `action:schedule_quest:pending-ref:${args.scheduledDate}:${args.scheduledStartTime ?? "allday"}`,
      actionType: "schedule_quest",
      summary: `Schedule "${args.idOrTitle ?? "(created earlier in this plan)"}" on ${args.scheduledDate}${timeLabel}`,
      preview: [
        { label: "Quest", before: null, after: `${args.idOrTitle ?? "(created earlier in this plan)"} (created earlier in this plan)` },
        { label: "Date", before: null, after: args.scheduledDate },
      ],
      // Never executed directly - resolveStepArgs+rebuildProposal always
      // replaces sourceArgs.idOrTitle with the real produced id first, at
      // which point a fully real proposal (with a real questId) is built.
      payload: { questId: "", scheduledDate: args.scheduledDate, scheduledStartTime: args.scheduledStartTime, scheduledEndTime: args.scheduledEndTime },
      sourceTool: "propose_schedule_quest",
      sourceArgs: args,
    };
  }

  const timeLabel = args.scheduledStartTime ? ` at ${args.scheduledStartTime}` : "";
  const preview: JarvisActionPreviewField[] = [
    { label: "Quest", before: null, after: quest.title },
    { label: "Date", before: quest.scheduledDate ?? "Unscheduled", after: args.scheduledDate },
    { label: "Time", before: quest.scheduledStartTime ?? "All day", after: args.scheduledStartTime ?? "All day" },
  ];

  return {
    id: `action:schedule_quest:${quest.id}:${args.scheduledDate}:${args.scheduledStartTime ?? "allday"}`,
    actionType: "schedule_quest",
    summary: `Schedule "${quest.title}" on ${args.scheduledDate}${timeLabel}`,
    preview,
    payload: { questId: quest.id, scheduledDate: args.scheduledDate, scheduledStartTime: args.scheduledStartTime, scheduledEndTime: args.scheduledEndTime },
    sourceTool: "propose_schedule_quest",
    sourceArgs: args,
  };
}

// Reuses applyQuestSchedule - the exact function Calendar's drag-and-drop
// already writes through (see rescheduleQuest in CalendarPageClient.tsx).
export function executeScheduleQuestAction(proposal: JarvisActionProposal, quests: ReadonlyArray<Quest>, setQuestDefinitions: (next: Quest[] | ((current: Quest[]) => Quest[])) => void): JarvisActionResult {
  const payload = proposal.payload as ScheduleQuestPayload;
  const quest = quests.find((item) => item.id === payload.questId);
  if (!quest) return { ok: false, message: "That Quest no longer exists.", verified: [] };

  const updated = applyQuestSchedule(quest, { scheduledDate: payload.scheduledDate, scheduledStartTime: payload.scheduledStartTime ?? null, scheduledEndTime: payload.scheduledEndTime ?? null });
  setQuestDefinitions((current) => current.map((item) => (item.id === payload.questId ? updated : item)));

  return {
    ok: true,
    message: `Scheduled "${updated.title}" on ${updated.scheduledDate}${updated.scheduledStartTime ? ` at ${updated.scheduledStartTime}` : ""}.`,
    verified: [{ label: "Date", before: quest.scheduledDate ?? "Unscheduled", after: updated.scheduledDate ?? "Unscheduled" }],
  };
}

// ---- create_quest ---------------------------------------------------------

export type CreateQuestPayload = Readonly<{ title: string; categoryId: string; kind: "task" | "habit"; xp: number; cadence: "daily" | "weekly" | "one-time" }>;

export function buildCreateQuestProposal(
  args: Readonly<{ title?: string; categoryId?: string; kind?: string; xp?: number; cadence?: string }>,
  attributes: ReadonlyArray<Category>,
): JarvisActionProposal | null {
  const title = args.title?.trim();
  if (!title) return null;

  // Must be a real, already-tracked Skill - never invented.
  const attribute = attributes.find((item) => item.id === args.categoryId) ?? attributes.find((item) => item.name.toLowerCase().includes((args.categoryId ?? "").toLowerCase()));
  if (!attribute) return null;

  const kind: "task" | "habit" = args.kind === "habit" ? "habit" : "task";
  const xp = Math.max(1, Math.min(200, Math.round(args.xp ?? 25)));
  const cadence: "daily" | "weekly" | "one-time" = args.cadence === "weekly" || args.cadence === "one-time" ? args.cadence : "daily";

  const preview: JarvisActionPreviewField[] = [
    { label: "Title", before: null, after: title },
    { label: "Type", before: null, after: kind === "habit" ? "Habit" : "Task" },
    { label: "Skill", before: null, after: attribute.name },
    { label: "XP", before: null, after: String(xp) },
  ];

  return {
    id: `action:create_quest:${Date.now()}`,
    actionType: "create_quest",
    summary: `Create ${kind === "habit" ? "Habit" : "Task"} "${title}" (${attribute.name}, +${xp} XP)`,
    preview,
    payload: { title, categoryId: attribute.id, kind, xp, cadence },
    sourceTool: "propose_create_quest",
    sourceArgs: args,
  };
}

// Reuses upsertQuestFromForm - the exact function every real Quest
// create/edit form (Calendar, Quest Manager) writes through.
export function executeCreateQuestAction(proposal: JarvisActionProposal, quests: ReadonlyArray<Quest>, setQuestDefinitions: (next: Quest[] | ((current: Quest[]) => Quest[])) => void): JarvisActionResult {
  const payload = proposal.payload as CreateQuestPayload;
  const form = createQuestFormModel({ title: payload.title, categoryId: payload.categoryId, kind: payload.kind, xp: payload.xp, cadence: payload.cadence, active: true });
  const updatedQuests = upsertQuestFromForm(quests, form);
  const created = updatedQuests.find((quest) => !quests.some((existing) => existing.id === quest.id));

  if (!created) return { ok: false, message: "Could not create the Quest.", verified: [] };

  setQuestDefinitions(updatedQuests);
  return { ok: true, message: `Created "${created.title}" (+${created.xp} XP).`, verified: [{ label: "Quest", before: null, after: created.title }], producedEntityId: created.id };
}

// ---- complete_quest / log_habit --------------------------------------------

export type CompleteQuestPayload = Readonly<{ questId: string }>;

// Deliberately scoped to plain Quests only (no linked Goal, no attribute
// override) - a goal-linked or reward-overridden Quest's real completion
// flow (useQuestCompletionFlow) needs to resolve a numeric progress value
// interactively, which JARVIS cannot safely do here. Declining is the
// honest behavior, not a silent approximation of the real reward/goal-
// contribution logic.
function buildCompleteOrLogProposal(
  args: Readonly<{ idOrTitle?: string; refs?: unknown }>,
  quests: ReadonlyArray<Quest>,
  completions: ReadonlyArray<QuestCompletion>,
  actionType: "complete_quest" | "log_habit",
  now: Date,
): JarvisActionProposal | null {
  const quest = findQuestByIdOrTitle(args.idOrTitle, quests);
  if (!quest) {
    if (!hasIdOrTitleRef(args)) return null;
    const verb = actionType === "log_habit" ? "Log" : "Complete";
    return {
      id: `action:${actionType}:pending-ref:${getLocalDayKey(now)}`,
      actionType,
      summary: `${verb} "${args.idOrTitle ?? "(created earlier in this plan)"}" for today`,
      preview: [{ label: "Quest", before: null, after: `${args.idOrTitle ?? "(created earlier in this plan)"} (created earlier in this plan)` }],
      payload: { questId: "" },
      sourceTool: actionType === "log_habit" ? "propose_log_habit" : "propose_complete_quest",
      sourceArgs: args,
    };
  }
  if (quest.status !== "active") return null;
  if (quest.linkedProgressGoalId || (quest.attributeXPOverride && quest.attributeXPOverride.length > 0)) return null;

  const todayKey = getLocalDayKey(now);
  const alreadyDoneToday = completions.some((completion) => completion.questId === quest.id && getLocalDayKey(completion.completedAt) === todayKey);
  if (alreadyDoneToday) return null;

  const verb = actionType === "log_habit" ? "Log" : "Complete";
  const preview: JarvisActionPreviewField[] = [
    { label: "Quest", before: "Not completed today", after: "Completed" },
    { label: "XP", before: null, after: `+${quest.xp}` },
  ];

  return {
    id: `action:${actionType}:${quest.id}:${todayKey}`,
    actionType,
    summary: `${verb} "${quest.title}" for today (+${quest.xp} XP)`,
    preview,
    payload: { questId: quest.id },
    sourceTool: actionType === "log_habit" ? "propose_log_habit" : "propose_complete_quest",
    sourceArgs: args,
  };
}

export function buildCompleteQuestProposal(args: Readonly<{ idOrTitle?: string; refs?: unknown }>, quests: ReadonlyArray<Quest>, completions: ReadonlyArray<QuestCompletion>, now: Date): JarvisActionProposal | null {
  return buildCompleteOrLogProposal(args, quests, completions, "complete_quest", now);
}

export function buildLogHabitProposal(args: Readonly<{ idOrTitle?: string; refs?: unknown }>, quests: ReadonlyArray<Quest>, completions: ReadonlyArray<QuestCompletion>, now: Date): JarvisActionProposal | null {
  return buildCompleteOrLogProposal(args, quests, completions, "log_habit", now);
}

// Reuses useProgression().completeQuest - safe here specifically because
// buildCompleteOrLogProposal already excluded any Quest whose completion
// would need resolved attribute rewards/goal contribution (see comment
// above).
export function executeCompleteOrLogAction(proposal: JarvisActionProposal, quests: ReadonlyArray<Quest>, completeQuest: (questId: string) => boolean): JarvisActionResult {
  const payload = proposal.payload as CompleteQuestPayload;
  const quest = quests.find((item) => item.id === payload.questId);
  if (!quest) return { ok: false, message: "That Quest no longer exists.", verified: [] };

  const success = completeQuest(payload.questId);
  if (!success) return { ok: false, message: `Could not complete "${quest.title}" - it may already be completed today or isn't scheduled for today.`, verified: [] };

  return {
    ok: true,
    message: `Completed "${quest.title}" (+${quest.xp} XP).`,
    verified: [
      { label: "Quest", before: "Not completed", after: "Completed" },
      { label: "XP", before: null, after: `+${quest.xp}` },
    ],
  };
}

// ---- create_note ---------------------------------------------------------

export type CreateNotePayload = Readonly<{ title: string; content: string }>;

export function buildCreateNoteProposal(args: Readonly<{ title?: string; content?: string }>): JarvisActionProposal | null {
  const title = args.title?.trim();
  const content = args.content?.trim();
  if (!title || !content) return null;

  const preview: JarvisActionPreviewField[] = [
    { label: "Title", before: null, after: title },
    { label: "Content", before: null, after: content.length > 80 ? `${content.slice(0, 80)}…` : content },
  ];

  return { id: `action:create_note:${Date.now()}`, actionType: "create_note", summary: `Create a Note titled "${title}"`, preview, payload: { title, content }, sourceTool: "propose_create_note", sourceArgs: args };
}

// Reuses useNotes().addNote - the exact function the real Note editor
// writes through.
export function executeCreateNoteAction(proposal: JarvisActionProposal, addNote: (draft: NoteDraft) => Note): JarvisActionResult {
  const payload = proposal.payload as CreateNotePayload;
  const created = addNote({ title: payload.title, content: payload.content });
  return { ok: true, message: `Created the Note "${created.title}".`, verified: [{ label: "Note", before: null, after: created.title }], producedEntityId: created.id };
}

// ---- update_goal ---------------------------------------------------------

export type UpdateGoalPayload =
  | Readonly<{ nodeId: string; mode: "progress"; progressDelta: number }>
  | Readonly<{ nodeId: string; mode: "status"; status: GoalNode["status"] }>;

export function buildUpdateGoalProposal(
  args: Readonly<{ idOrTitle?: string; progressDelta?: number; status?: string; refs?: unknown }>,
  goalTree: GoalTree,
): JarvisActionProposal | null {
  const flat = flattenGoalTree(goalTree);
  const node = findGoalByIdOrTitle(args.idOrTitle, flat);
  if (!node) {
    if (!hasIdOrTitleRef(args)) return null;
    const after = typeof args.progressDelta === "number" ? `${args.progressDelta > 0 ? "+" : ""}${args.progressDelta}` : (args.status ?? "");
    return {
      id: `action:update_goal:pending-ref:${Date.now()}`,
      actionType: "update_goal",
      summary: `Update "${args.idOrTitle ?? "(created earlier in this plan)"}" (${after})`,
      preview: [{ label: "Goal", before: null, after: `${args.idOrTitle ?? "(created earlier in this plan)"} (created earlier in this plan)` }],
      payload: { nodeId: "", mode: "status", status: "in_progress" },
      sourceTool: "propose_update_goal",
      sourceArgs: args,
    };
  }

  if (typeof args.progressDelta === "number" && args.progressDelta !== 0 && node.type === "progress_goal") {
    const before = node.currentValue ?? 0;
    const after = before + args.progressDelta;
    const unit = node.unit ? ` ${node.unit}` : "";
    const preview: JarvisActionPreviewField[] = [{ label: "Progress", before: `${before}${unit}`, after: `${after}${unit}` }];
    return {
      id: `action:update_goal:${node.id}:progress:${Date.now()}`,
      actionType: "update_goal",
      summary: `Update "${node.title}" by ${args.progressDelta > 0 ? "+" : ""}${args.progressDelta}${unit}`,
      preview,
      payload: { nodeId: node.id, mode: "progress", progressDelta: args.progressDelta },
      sourceTool: "propose_update_goal",
      sourceArgs: args,
    };
  }

  if (args.status === "not_started" || args.status === "in_progress" || args.status === "completed") {
    if (args.status === node.status) return null;
    const preview: JarvisActionPreviewField[] = [{ label: "Status", before: node.status, after: args.status }];
    return {
      id: `action:update_goal:${node.id}:status:${args.status}`,
      actionType: "update_goal",
      summary: `Set "${node.title}" status to ${args.status.replace("_", " ")}`,
      preview,
      payload: { nodeId: node.id, mode: "status", status: args.status },
      sourceTool: "propose_update_goal",
      sourceArgs: args,
    };
  }

  return null;
}

// Reuses useGoalTree().updateProgressGoal / .saveNode - the exact functions
// the real Goal Tree editor writes through. For the status path, the
// verified result is computed with the SAME pure functions saveNode uses
// internally (updateGoalNode + normalizeGoalTree) before committing, so
// verification never diverges from what's actually persisted.
export function executeUpdateGoalAction(
  proposal: JarvisActionProposal,
  goalTree: GoalTree,
  updateProgressGoal: (nodeId: string, increment: number) => GoalTree,
  saveNode: (nodeId: string, updater: (current: GoalNode) => GoalNode) => void,
): JarvisActionResult {
  const payload = proposal.payload as UpdateGoalPayload;

  if (payload.mode === "progress") {
    const updatedTree = updateProgressGoal(payload.nodeId, payload.progressDelta);
    const after = flattenGoalTree(updatedTree).find((node) => node.id === payload.nodeId);
    if (!after) return { ok: false, message: "Could not update that Goal.", verified: [] };
    const unit = after.unit ? ` ${after.unit}` : "";
    return {
      ok: true,
      message: `Updated "${after.title}" - now ${after.currentValue ?? 0}${unit} (${Math.round(after.progress)}%).`,
      verified: [{ label: "Progress", before: null, after: `${after.currentValue ?? 0}${unit}` }],
    };
  }

  const updater = (current: GoalNode): GoalNode => ({ ...current, status: payload.status, updatedAt: new Date().toISOString() });
  const computed = normalizeGoalTree(updateGoalNode(goalTree, payload.nodeId, updater));
  const after = flattenGoalTree(computed).find((node) => node.id === payload.nodeId);
  if (!after) return { ok: false, message: "Could not update that Goal.", verified: [] };

  saveNode(payload.nodeId, updater);
  return { ok: true, message: `Updated "${after.title}" status to ${after.status.replace("_", " ")}.`, verified: [{ label: "Status", before: null, after: after.status }] };
}

// ---- Stale-action protection (Phase 16) ------------------------------------
//
// A proposal shown to the user may be minutes old by the time they confirm
// it (or, for a multi-step plan, an earlier step may have just changed the
// very data a later step's proposal depended on). Rather than execute the
// ORIGINAL payload blindly, every confirmation path (single action or plan
// step - see useJarvisConversation.ts / plan-engine.ts) rebuilds the
// proposal from its own sourceTool/sourceArgs against the CURRENT data
// using the exact same build* functions above. If the rebuild returns
// null, the action is genuinely stale (the Quest was deleted, already
// completed, the Goal status already matches, etc.) and is reported as
// such instead of executing against outdated assumptions.

export type RebuildContext = Readonly<{
  now: Date;
  quests: ReadonlyArray<Quest>;
  completions: ReadonlyArray<QuestCompletion>;
  goalTree: GoalTree;
  attributes: ReadonlyArray<Category>;
}>;

export function rebuildProposal(sourceTool: string, sourceArgs: Readonly<Record<string, unknown>>, context: RebuildContext): JarvisActionProposal | null {
  switch (sourceTool) {
    case "propose_schedule_quest":
      return buildScheduleQuestProposal(sourceArgs, context.quests);
    case "propose_create_quest":
      return buildCreateQuestProposal(sourceArgs, context.attributes);
    case "propose_complete_quest":
      return buildCompleteQuestProposal(sourceArgs, context.quests, context.completions, context.now);
    case "propose_log_habit":
      return buildLogHabitProposal(sourceArgs, context.quests, context.completions, context.now);
    case "propose_create_note":
      return buildCreateNoteProposal(sourceArgs);
    case "propose_update_goal":
      return buildUpdateGoalProposal(sourceArgs, context.goalTree);
    case "propose_open_application":
      return buildOpenApplicationProposal(sourceArgs);
    default:
      return null;
  }
}
