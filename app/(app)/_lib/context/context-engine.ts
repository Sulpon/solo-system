import { computePersonalIntelligence } from "../intelligence/intelligence-engine";
import { computeAchievementMoments } from "../achievements/achievement-moment-engine";
import { computePersonalMemory } from "../memory/memory-engine";
import { rankByRelevance, type RelevanceContext } from "../memory/memory-relevance-engine";
import { getQuestRelationships, type RelatedEntity, type RelatedEntityGroup } from "../relationships";
import { getEvents } from "../activity-events";
import type { AppNavItem } from "../icons/app-icon-map";
import type { GoalTree } from "../types/goal-tree";
import type { Quest, QuestCompletion, EisenhowerQuadrant } from "../types/quest";
import type { Note } from "../types/note";
import type { MediaItem } from "../types/media-item";
import type { Category } from "../types/category";
import type { FocusHistoryEntry } from "../types/focus";
import type { ActivityEvent } from "../types/activity-event";
import type { CalendarQuestItem } from "../engines/quest-calendar-engine";
import type { PriorityGateState } from "../engines/priority-gate-engine";
import type { PresentMomentState } from "../engines/present-moment-engine";
import type { PersonalState, PersonalInsight, PersonalSignal, PersonalRecommendation, NextAction } from "../intelligence/types";
import type { AchievementMoment } from "../achievements/types";
import type { MemoryFreshness, MemoryType, PersonalMemory } from "../memory/types";

// Phase 13 Steps 10/23 - the Context Engine. Composes EVERYTHING that
// already exists (Personal Intelligence, Achievement Intelligence, Personal
// Memory, the relationship layer) into one structured payload - the
// documented future input contract for JARVIS. This is a NEW, pure,
// lower-level engine consumed BY useAtlasContext()'s ecosystem, not a
// replacement for it: useAtlasContext() itself (atlas-context.ts) is left
// completely untouched - it stays the lightweight, always-mounted, minute-
// ticking read every component already uses. This engine is the heavier
// composition that a smaller number of context-aware surfaces (Mission
// Control, and eventually JARVIS) opt into via useAtlasIntelligenceContext()
// (see hooks/useAtlasIntelligenceContext.ts).

export type ContextEngineInput = Readonly<{
  now: Date;
  currentApp: AppNavItem | null;
  activeQuest: Quest | null;
  isQuestExecution: boolean;
  currentPriorityQuadrant: EisenhowerQuadrant | null;
  presentMoment: PresentMomentState;
  todaysCalendarItems: ReadonlyArray<CalendarQuestItem>;
  priorityGateState: PriorityGateState | null;
  availableUnscheduledMinutes: number | null;
  goalTree: GoalTree;
  quests: ReadonlyArray<Quest>;
  completions: ReadonlyArray<QuestCompletion>;
  notes: ReadonlyArray<Note>;
  libraryItems: ReadonlyArray<MediaItem>;
  attributes: ReadonlyArray<Category>;
  focusHistory: ReadonlyArray<FocusHistoryEntry>;
  activityEvents: ReadonlyArray<ActivityEvent>;
}>;

export type RankedMemory = Readonly<{ memory: PersonalMemory; relevance: number; freshness: MemoryFreshness }>;

// Step 23's structured JARVIS context contract.
export type StructuredAtlasContext = Readonly<{
  currentState: PersonalState;
  activeMission: PersonalState["activeMission"];
  nextBestAction: NextAction | null;
  relevantGoals: ReadonlyArray<RelatedEntity>;
  relevantMemories: ReadonlyArray<RankedMemory>;
  recentAchievements: ReadonlyArray<AchievementMoment>;
  recentEvents: ReadonlyArray<ActivityEvent>;
  upcomingDeadlines: PersonalState["upcomingDeadlines"];
  relevantRelationships: ReadonlyArray<RelatedEntityGroup>;
  importantInsights: ReadonlyArray<PersonalInsight>;
  // Phase 17 - the FULL, uncapped signal/recommendation sets Phase 11
  // already computes (computePersonalIntelligence's own `signals`/
  // `recommendations`, not the top-5-across-all-types `importantInsights`
  // projection above). Adaptive planning across an entire goal portfolio
  // (e.g. "plan my week", "what should I cut") needs every goal's
  // momentum/friction/neglect/goal_risk signal, not just whichever few
  // made the general-purpose top-5 - exposing what's already computed
  // costs nothing extra and duplicates no scoring logic.
  allSignals: ReadonlyArray<PersonalSignal>;
  allRecommendations: ReadonlyArray<PersonalRecommendation>;
  currentApp: AppNavItem | null;
  now: Date;
}>;

const MAX_RELEVANT_MEMORIES = 6;
const MAX_RECENT_EVENTS = 10;
const MAX_RECENT_ACHIEVEMENTS = 5;
const MAX_INSIGHTS = 5;

// Step 12 - app-aware context, implemented as ONE shared boost table
// (never per-app bespoke logic). A memory type gets a modest relevance
// boost when its content is typically what that app's user cares about
// right now; everything else keeps its base relevance score unchanged.
const APP_TYPE_BOOST: Readonly<Record<string, ReadonlyArray<MemoryType>>> = {
  "/notes": ["fact", "experience", "lesson"],
  "/calendar": ["pattern", "preference"],
  "/goals": ["goal", "lesson", "pattern"],
  "/quests": ["pattern", "preference", "experience"],
  "/world-map": ["goal"],
};
const APP_BOOST_MULTIPLIER = 1.15;

function applyAppBoost(memory: PersonalMemory, relevance: number, currentApp: AppNavItem | null): number {
  if (!currentApp) return relevance;
  const boostedTypes = APP_TYPE_BOOST[currentApp.href];
  if (!boostedTypes || !boostedTypes.includes(memory.type)) return relevance;
  return Math.round(relevance * APP_BOOST_MULTIPLIER);
}

export function computeAtlasIntelligenceContext(input: ContextEngineInput): StructuredAtlasContext {
  const intelligenceInput = {
    now: input.now,
    goalTree: input.goalTree,
    quests: input.quests,
    completions: input.completions,
    notes: input.notes,
    libraryItems: input.libraryItems,
    attributes: input.attributes,
    focusHistory: input.focusHistory,
    activityEvents: input.activityEvents,
  };

  const intelligence = computePersonalIntelligence({
    ...intelligenceInput,
    todaysCalendarItems: input.todaysCalendarItems,
    priorityGateState: input.priorityGateState,
    availableUnscheduledMinutes: input.availableUnscheduledMinutes,
    presentMoment: input.presentMoment,
    activeQuest: input.activeQuest,
    isQuestExecution: input.isQuestExecution,
    currentPriorityQuadrant: input.currentPriorityQuadrant,
  });

  const achievementMoments = computeAchievementMoments(intelligenceInput);
  const memories = computePersonalMemory({ ...intelligenceInput, achievementMoments });

  // Step 11/13/14/15 - relevance: what's "in view" right now (Quest ->
  // Goal, via the real linkedProgressGoalId field, never a re-derived
  // relationship), ranked, then app-boosted (Step 12).
  const contextEntityIds = new Set<string>();
  if (input.activeQuest) {
    contextEntityIds.add(input.activeQuest.id);
    if (input.activeQuest.linkedProgressGoalId) contextEntityIds.add(input.activeQuest.linkedProgressGoalId);
  }
  const relevanceContext: RelevanceContext = { now: input.now, contextEntityIds };
  const relevantMemories = rankByRelevance(memories, relevanceContext)
    .map((entry) => ({ ...entry, relevance: applyAppBoost(entry.memory, entry.relevance, input.currentApp) }))
    .sort((first, second) => second.relevance - first.relevance)
    .slice(0, MAX_RELEVANT_MEMORIES);

  const relevantGoals: RelatedEntity[] = input.goalTree
    .filter((node) => (node.type === "dream" || node.type === "long_term_goal") && node.status !== "completed")
    .map((node) => ({ id: node.id, title: node.title, href: "/goals", meta: `${Math.round(node.progress)}%` }));

  // Step 13 - reuse the relationship layer directly (never a second graph):
  // when a mission is active, its own Connected groups become the
  // "currently relevant relationships."
  const relevantRelationships = input.activeQuest
    ? getQuestRelationships(input.activeQuest, input.goalTree, input.notes, input.libraryItems, input.attributes, input.focusHistory)
    : [];

  return {
    currentState: intelligence.state,
    activeMission: intelligence.state.activeMission,
    nextBestAction: intelligence.nextAction,
    relevantGoals,
    relevantMemories,
    recentAchievements: achievementMoments.slice(0, MAX_RECENT_ACHIEVEMENTS),
    recentEvents: getEvents(input.activityEvents).slice(0, MAX_RECENT_EVENTS),
    upcomingDeadlines: intelligence.state.upcomingDeadlines,
    relevantRelationships,
    importantInsights: intelligence.insights.slice(0, MAX_INSIGHTS),
    allSignals: intelligence.signals,
    allRecommendations: intelligence.recommendations,
    currentApp: input.currentApp,
    now: input.now,
  };
}
