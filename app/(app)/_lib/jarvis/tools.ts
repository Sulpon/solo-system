import { getGoalRelationships, getQuestRelationships } from "../relationships";
import { flattenGoalTree } from "../goal-tree-storage";
import { getQuestsForDate } from "../engines/quest-calendar-engine";
import type { StructuredAtlasContext } from "../context/context-engine";
import type { CalendarQuestItem } from "../engines/quest-calendar-engine";
import type { GoalTree } from "../types/goal-tree";
import type { Quest, QuestCompletion } from "../types/quest";
import type { Note } from "../types/note";
import type { MediaItem } from "../types/media-item";
import type { Category } from "../types/category";
import type { FocusHistoryEntry } from "../types/focus";
import type { ActivityEvent } from "../types/activity-event";
import type { AchievementMoment } from "../achievements/types";
import type { PersonalMemory } from "../memory/types";
import type { LLMToolDefinition } from "./types";

// Phase 14 Step 8 - a narrow, READ-ONLY tool interface. Every tool is a
// thin wrapper around an existing Atlas engine/query - none of these
// compute anything new. Executed CLIENT-SIDE (see types.ts's architecture
// note) against real, already-loaded Atlas data - never a server database
// query, since Atlas has no server-side database.

export type ToolExecutionContext = Readonly<{
  now: Date;
  structured: StructuredAtlasContext;
  achievementMoments: ReadonlyArray<AchievementMoment>;
  memories: ReadonlyArray<PersonalMemory>;
  goalTree: GoalTree;
  quests: ReadonlyArray<Quest>;
  completions: ReadonlyArray<QuestCompletion>;
  notes: ReadonlyArray<Note>;
  libraryItems: ReadonlyArray<MediaItem>;
  attributes: ReadonlyArray<Category>;
  focusHistory: ReadonlyArray<FocusHistoryEntry>;
  activityEvents: ReadonlyArray<ActivityEvent>;
  todaysCalendarItems: ReadonlyArray<CalendarQuestItem>;
}>;

export type ToolResult = Readonly<{ ok: boolean; data: unknown }>;

function findGoal(context: ToolExecutionContext, idOrTitle: string | undefined) {
  if (!idOrTitle) return null;
  const flat = flattenGoalTree(context.goalTree);
  return flat.find((node) => node.id === idOrTitle) ?? flat.find((node) => node.title.toLowerCase().includes(idOrTitle.toLowerCase())) ?? null;
}

function findQuest(context: ToolExecutionContext, idOrTitle: string | undefined) {
  if (!idOrTitle) return null;
  return context.quests.find((quest) => quest.id === idOrTitle) ?? context.quests.find((quest) => quest.title.toLowerCase().includes(idOrTitle.toLowerCase())) ?? null;
}

function calendarItemsFor(context: ToolExecutionContext, when: string | undefined): ReadonlyArray<CalendarQuestItem> {
  if (!when || when === "today") return context.todaysCalendarItems;
  if (when === "tomorrow") {
    const tomorrow = new Date(context.now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getQuestsForDate(context.quests, context.completions, tomorrow, context.now);
  }
  const parsed = new Date(when);
  if (Number.isNaN(parsed.getTime())) return [];
  return getQuestsForDate(context.quests, context.completions, parsed, context.now);
}

// ---- Tool definitions (sent to the LLM) ------------------------------------

export const JARVIS_TOOLS: ReadonlyArray<LLMToolDefinition> = [
  { name: "get_current_state", description: "Get Atlas's current deterministic state: active mission, current priority quadrant, present-moment status, momentum/friction/neglect signals.", inputSchema: { type: "object", properties: {} } },
  { name: "get_next_best_action", description: "Get Atlas's deterministic recommendation for what to do right now, with evidence. Returns null if a mission is already active or nothing qualifies.", inputSchema: { type: "object", properties: {} } },
  { name: "get_goal", description: "Get details and real connected entities for one Goal, by id or title.", inputSchema: { type: "object", properties: { idOrTitle: { type: "string" } }, required: ["idOrTitle"] } },
  { name: "get_quest", description: "Get details and real connected entities for one Quest, by id or title.", inputSchema: { type: "object", properties: { idOrTitle: { type: "string" } }, required: ["idOrTitle"] } },
  { name: "get_calendar", description: "Get real scheduled Quests for a day: 'today', 'tomorrow', or an ISO date.", inputSchema: { type: "object", properties: { when: { type: "string" } } } },
  { name: "get_recent_achievements", description: "Get recent, real, evidence-backed Achievement Moments.", inputSchema: { type: "object", properties: { limit: { type: "number" } } } },
  { name: "search_memory", description: "Search Atlas's derived Personal Memory (facts, patterns, preferences, experiences, lessons) for a keyword.", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
  { name: "get_relationships", description: "Get the real connected entities (Quests, Skills, Notes, Library, World, Chronicle) for a Goal or Quest.", inputSchema: { type: "object", properties: { entityType: { type: "string", enum: ["goal", "quest"] }, idOrTitle: { type: "string" } }, required: ["entityType", "idOrTitle"] } },
  { name: "get_focus_patterns", description: "Get Atlas's derived behavioral patterns and preferences about how the user focuses/works (working-time clustering, abandonment tendencies, consistent habits).", inputSchema: { type: "object", properties: {} } },
];

// ---- Tool execution (real Atlas data, no invention) ------------------------

function executeGetCurrentState(context: ToolExecutionContext): ToolResult {
  const state = context.structured.currentState;
  return {
    ok: true,
    data: {
      activeMission: state.activeMission,
      currentPriority: state.currentPriority,
      presentMoment: state.presentMoment,
      goalMomentum: state.goalMomentum.map((signal) => ({ label: signal.label, explanation: signal.explanation })),
      friction: state.friction.map((signal) => ({ label: signal.label, explanation: signal.explanation })),
      neglectedAreas: state.neglectedAreas.map((signal) => ({ label: signal.label, explanation: signal.explanation })),
      workload: state.workload ? { explanation: state.workload.explanation } : null,
    },
  };
}

function executeGetNextBestAction(context: ToolExecutionContext): ToolResult {
  const action = context.structured.nextBestAction;
  if (!action) return { ok: true, data: { available: false, reason: context.structured.activeMission ? "A mission is already active." : "No qualifying recommendation right now." } };
  return { ok: true, data: { available: true, title: action.title, reason: action.reason, evidence: action.evidence, href: action.href } };
}

function executeGetGoal(context: ToolExecutionContext, args: Readonly<{ idOrTitle?: string }>): ToolResult {
  const node = findGoal(context, args.idOrTitle);
  if (!node) return { ok: false, data: { error: "No matching Goal found in Atlas." } };
  const groups = getGoalRelationships(node.id, context.goalTree, context.quests, context.notes, context.libraryItems, context.attributes, context.activityEvents);
  return { ok: true, data: { id: node.id, title: node.title, type: node.type, status: node.status, progress: node.progress, periodEnd: node.periodEnd ?? null, connected: groups.map((group) => ({ label: group.label, items: group.entities.map((entity) => entity.title) })) } };
}

function executeGetQuest(context: ToolExecutionContext, args: Readonly<{ idOrTitle?: string }>): ToolResult {
  const quest = findQuest(context, args.idOrTitle);
  if (!quest) return { ok: false, data: { error: "No matching Quest found in Atlas." } };
  const groups = getQuestRelationships(quest, context.goalTree, context.notes, context.libraryItems, context.attributes, context.focusHistory);
  return { ok: true, data: { id: quest.id, title: quest.title, kind: quest.kind ?? null, status: quest.status, scheduledDate: quest.scheduledDate ?? null, connected: groups.map((group) => ({ label: group.label, items: group.entities.map((entity) => entity.title) })) } };
}

function executeGetCalendar(context: ToolExecutionContext, args: Readonly<{ when?: string }>): ToolResult {
  const items = calendarItemsFor(context, args.when);
  return { ok: true, data: { when: args.when ?? "today", items: items.map((item) => ({ title: item.quest.title, status: item.status, time: item.startTime })) } };
}

function executeGetRecentAchievements(context: ToolExecutionContext, args: Readonly<{ limit?: number }>): ToolResult {
  const limit = Math.min(args.limit ?? 5, 10);
  return { ok: true, data: context.achievementMoments.slice(0, limit).map((moment) => ({ title: moment.title, type: moment.type, explanation: moment.explanation, evidence: moment.evidence.map((item) => item.label), significance: moment.significance })) };
}

function executeSearchMemory(context: ToolExecutionContext, args: Readonly<{ query?: string }>): ToolResult {
  const query = (args.query ?? "").toLowerCase().trim();
  if (!query) return { ok: false, data: { error: "No search query provided." } };
  const matches = context.memories.filter((memory) => memory.content.toLowerCase().includes(query) || memory.label.toLowerCase().includes(query));
  return { ok: true, data: matches.slice(0, 8).map((memory) => ({ type: memory.type, origin: memory.origin, content: memory.content, confidence: memory.confidence })) };
}

function executeGetRelationships(context: ToolExecutionContext, args: Readonly<{ entityType?: string; idOrTitle?: string }>): ToolResult {
  if (args.entityType === "goal") {
    const node = findGoal(context, args.idOrTitle);
    if (!node) return { ok: false, data: { error: "No matching Goal found in Atlas." } };
    const groups = getGoalRelationships(node.id, context.goalTree, context.quests, context.notes, context.libraryItems, context.attributes, context.activityEvents);
    return { ok: true, data: groups.map((group) => ({ label: group.label, items: group.entities.map((entity) => entity.title) })) };
  }
  if (args.entityType === "quest") {
    const quest = findQuest(context, args.idOrTitle);
    if (!quest) return { ok: false, data: { error: "No matching Quest found in Atlas." } };
    const groups = getQuestRelationships(quest, context.goalTree, context.notes, context.libraryItems, context.attributes, context.focusHistory);
    return { ok: true, data: groups.map((group) => ({ label: group.label, items: group.entities.map((entity) => entity.title) })) };
  }
  return { ok: false, data: { error: "entityType must be 'goal' or 'quest'." } };
}

function executeGetFocusPatterns(context: ToolExecutionContext): ToolResult {
  const patterns = context.memories.filter((memory) => memory.type === "pattern" || memory.type === "preference");
  if (patterns.length === 0) return { ok: true, data: { available: false, reason: "Not enough Focus/Quest history yet to derive a behavioral pattern." } };
  return { ok: true, data: patterns.map((memory) => ({ type: memory.type, content: memory.content, confidence: memory.confidence })) };
}

export function executeTool(name: string, rawArgs: Readonly<Record<string, unknown>>, context: ToolExecutionContext): ToolResult {
  switch (name) {
    case "get_current_state":
      return executeGetCurrentState(context);
    case "get_next_best_action":
      return executeGetNextBestAction(context);
    case "get_goal":
      return executeGetGoal(context, rawArgs as { idOrTitle?: string });
    case "get_quest":
      return executeGetQuest(context, rawArgs as { idOrTitle?: string });
    case "get_calendar":
      return executeGetCalendar(context, rawArgs as { when?: string });
    case "get_recent_achievements":
      return executeGetRecentAchievements(context, rawArgs as { limit?: number });
    case "search_memory":
      return executeSearchMemory(context, rawArgs as { query?: string });
    case "get_relationships":
      return executeGetRelationships(context, rawArgs as { entityType?: string; idOrTitle?: string });
    case "get_focus_patterns":
      return executeGetFocusPatterns(context);
    default:
      return { ok: false, data: { error: `Unknown tool: ${name}` } };
  }
}
