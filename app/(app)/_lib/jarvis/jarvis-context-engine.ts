import { getGoalRelationships, getQuestRelationships, type RelatedEntityGroup } from "../relationships";
import type { StructuredAtlasContext } from "../context/context-engine";
import type { CalendarQuestItem } from "../engines/quest-calendar-engine";
import type { GoalTree } from "../types/goal-tree";
import type { Quest } from "../types/quest";
import type { Note } from "../types/note";
import type { MediaItem } from "../types/media-item";
import type { Category } from "../types/category";
import type { FocusHistoryEntry } from "../types/focus";
import type { ActivityEvent } from "../types/activity-event";
import type { ContextSlice } from "./context-selector";
import type { JarvisContext, JarvisContextRelationshipGroup } from "./types";

// Phase 14 Step 4 - projects Phase 13's StructuredAtlasContext (already a
// real, deterministic composition of Personal Intelligence + Achievement
// Intelligence + Memory + Relationships) down into the smaller, bounded
// JarvisContext the LLM actually receives. This file computes NOTHING new
// about Atlas - it only selects and truncates fields that already exist,
// per the slices context-selector.ts chose for the current question.

// Step 18 - contextual entry points pass a seed entity so JARVIS never has
// to "rediscover" what the user is already looking at; its relationships
// are force-included regardless of which slices the question matched.
export type JarvisEntitySeed = Readonly<{ type: "goal" | "quest"; id: string }>;

export type JarvisContextBuildInput = Readonly<{
  structured: StructuredAtlasContext;
  todaysCalendarItems: ReadonlyArray<CalendarQuestItem>;
  selectedSlices: ReadonlySet<ContextSlice>;
  seed?: JarvisEntitySeed;
  goalTree: GoalTree;
  quests: ReadonlyArray<Quest>;
  notes: ReadonlyArray<Note>;
  libraryItems: ReadonlyArray<MediaItem>;
  attributes: ReadonlyArray<Category>;
  activityEvents: ReadonlyArray<ActivityEvent>;
  focusHistory: ReadonlyArray<FocusHistoryEntry>;
}>;

const MAX_GOALS = 8;
const MAX_CALENDAR_ITEMS = 8;
const MAX_INSIGHTS = 5;
const MAX_ACHIEVEMENTS = 5;
const MAX_MEMORIES = 6;
const MAX_RELATIONSHIP_GROUPS = 6;
const MAX_ITEMS_PER_GROUP = 6;

function toRelationshipSummary(groups: ReadonlyArray<RelatedEntityGroup>): JarvisContextRelationshipGroup[] {
  return groups.slice(0, MAX_RELATIONSHIP_GROUPS).map((group) => ({ label: group.label, items: group.entities.slice(0, MAX_ITEMS_PER_GROUP).map((entity) => entity.title) }));
}

function parseProgressMeta(meta: string | undefined): number {
  if (!meta) return 0;
  const parsed = Number(meta.replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildJarvisContext(input: JarvisContextBuildInput): JarvisContext {
  const { structured, selectedSlices } = input;

  const goals = selectedSlices.has("goals")
    ? structured.relevantGoals.slice(0, MAX_GOALS).map((goal) => ({ id: goal.id, title: goal.title, progress: parseProgressMeta(goal.meta), status: "active" }))
    : [];

  const todaysCalendar = selectedSlices.has("calendar")
    ? input.todaysCalendarItems.slice(0, MAX_CALENDAR_ITEMS).map((item) => ({ questId: item.quest.id, title: item.quest.title, status: item.status, time: item.startTime }))
    : [];

  const insights = selectedSlices.has("intelligence")
    ? structured.importantInsights.slice(0, MAX_INSIGHTS).map((insight) => ({ title: insight.title, explanation: insight.explanation, priority: insight.priority, evidence: insight.evidence }))
    : [];

  const recentAchievements = selectedSlices.has("achievements")
    ? structured.recentAchievements.slice(0, MAX_ACHIEVEMENTS).map((moment) => ({ title: moment.title, explanation: moment.explanation, type: moment.type, evidence: moment.evidence.map((item) => item.label) }))
    : [];

  const relevantMemories = selectedSlices.has("memory")
    ? structured.relevantMemories.slice(0, MAX_MEMORIES).map((entry) => ({ type: entry.memory.type, origin: entry.memory.origin, content: entry.memory.content, confidence: entry.memory.confidence }))
    : [];

  let relationships: JarvisContextRelationshipGroup[] = selectedSlices.has("relationships") ? toRelationshipSummary(structured.relevantRelationships) : [];

  if (input.seed) {
    const seedGroups =
      input.seed.type === "goal"
        ? getGoalRelationships(input.seed.id, input.goalTree, input.quests, input.notes, input.libraryItems, input.attributes, input.activityEvents)
        : (() => {
            const quest = input.quests.find((item) => item.id === input.seed?.id);
            return quest ? getQuestRelationships(quest, input.goalTree, input.notes, input.libraryItems, input.attributes, input.focusHistory) : [];
          })();
    relationships = toRelationshipSummary(seedGroups);
  }

  return {
    now: structured.now.toISOString(),
    currentApp: structured.currentApp?.name ?? null,
    activeMission: structured.activeMission,
    presentMoment: {
      importantWorkComplete: structured.currentState.presentMoment.importantWorkComplete,
      availableUnscheduledMinutes: structured.currentState.presentMoment.availableUnscheduledMinutes,
      nextCommitment: structured.currentState.presentMoment.nextCommitment,
    },
    priorityGate: { currentQuadrant: structured.currentState.currentPriority },
    nextBestAction: selectedSlices.has("priority") && structured.nextBestAction ? { title: structured.nextBestAction.title, reason: structured.nextBestAction.reason, evidence: structured.nextBestAction.evidence } : null,
    goals,
    todaysCalendar,
    insights,
    recentAchievements,
    relevantMemories,
    relationships,
  };
}
