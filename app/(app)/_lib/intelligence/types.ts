import type { EisenhowerQuadrant } from "../types/quest";
import type { PresentMomentState } from "../engines/present-moment-engine";

// Phase 11's "Personal Intelligence Foundation" - shared types for the
// deterministic Signal -> State -> Insight -> Recommendation -> Next Action
// pipeline. Every type here is intentionally React/persistence/LLM-free;
// see signal-engine.ts / state-engine.ts / insight-engine.ts /
// recommendation-engine.ts / next-action-engine.ts / intelligence-engine.ts
// for the pure functions that produce these values from real Atlas data.

export type SignalType =
  | "momentum"
  | "friction"
  | "neglect"
  | "goal_risk"
  | "overload"
  | "focus_quality"
  | "completion_momentum"
  | "priority_conflict";

export type SignalPolarity = "positive" | "negative" | "neutral";

export type SignalEntityType = "goal" | "quest" | "global";

// A single piece of derived evidence about the user's real behavior. Every
// signal MUST be traceable to real stored data (sourceIds/evidence) - see
// each compute function in signal-engine.ts for exactly which fields back
// it. A signal is never emitted "for completeness" - insufficient data
// means no signal, not a weak/fabricated one (confidence is a strength
// modifier for signals that DO exist, not a way to represent absence).
export type PersonalSignal = Readonly<{
  id: string;
  type: SignalType;
  polarity: SignalPolarity;
  // 0-1: how pronounced the underlying pattern is (e.g. consecutive days,
  // deadline proximity), independent of how much data backs it.
  strength: number;
  // 0-1: how much real data backs this signal (sample size, data recency).
  confidence: number;
  entityType: SignalEntityType;
  entityId: string;
  label: string;
  explanation: string;
  evidence: ReadonlyArray<string>;
  sourceIds: ReadonlyArray<string>;
  // For a goal-scoped signal: the one concrete, active linked Quest the
  // recommendation engine should point the user at (e.g. "open this Quest
  // and reduce it to Minimum Success"). Populated by signal-engine.ts,
  // which already has the goal's linked quests in scope from
  // getGoalRelationships() - never re-derived downstream.
  relatedQuestId?: string;
}>;

export type UpcomingDeadline = Readonly<{
  goalId: string;
  title: string;
  periodEnd: string;
  daysRemaining: number;
  progress: number;
}>;

// A deterministic snapshot of "what is happening right now" - composes
// useAtlasContext() (Present-Moment Engine, Priority Gate, active
// mission/focus session, progression) with the signal layer below. Never
// recomputes anything useAtlasContext() already derives.
export type PersonalState = Readonly<{
  presentMoment: PresentMomentState;
  activeMission: Readonly<{ questId: string; title: string }> | null;
  currentPriority: EisenhowerQuadrant | null;
  goalMomentum: ReadonlyArray<PersonalSignal>;
  friction: ReadonlyArray<PersonalSignal>;
  neglectedAreas: ReadonlyArray<PersonalSignal>;
  workload: PersonalSignal | null;
  focusQuality: PersonalSignal | null;
  completionMomentum: PersonalSignal | null;
  priorityConflict: PersonalSignal | null;
  recentAchievementTitles: ReadonlyArray<string>;
  upcomingDeadlines: ReadonlyArray<UpcomingDeadline>;
}>;

export type InsightPriority = "high" | "medium" | "low";

// The "why" layer - a signal turned into a titled, evidenced statement. An
// insight never states an interpretation the evidence doesn't support (see
// insight-engine.ts's title/explanation templates - fact-only phrasing,
// never psychological claims).
export type PersonalInsight = Readonly<{
  id: string;
  type: SignalType;
  title: string;
  explanation: string;
  evidence: ReadonlyArray<string>;
  confidence: number;
  priority: InsightPriority;
  relatedEntityIds: ReadonlyArray<string>;
  href: string | null;
}>;

export type RecommendationActionType =
  | "start_focus_session"
  | "reduce_to_minimum_success"
  | "schedule_quest"
  | "continue_context"
  | "review_goal"
  | "open_time_suggestion";

// A concrete, in-app action the user can actually take - never a vague
// exhortation. Every recommendation traces back to the insight(s)/signal(s)
// that produced it via `evidence`.
export type PersonalRecommendation = Readonly<{
  id: string;
  actionType: RecommendationActionType;
  title: string;
  reason: string;
  evidence: ReadonlyArray<string>;
  entityId: string | null;
  href: string | null;
  priorityScore: number;
}>;

// The Step 7 "What should I do now?" result and Step 9 decision-compression
// brief - the single highest-priority recommendation, reshaped into the
// CURRENT MISSION / WHY / NEXT structure Mission Control renders.
export type NextAction = Readonly<{
  entityId: string | null;
  actionType: RecommendationActionType;
  title: string;
  reason: string;
  evidence: ReadonlyArray<string>;
  priorityScore: number;
  href: string | null;
  availableMinutes: number | null;
}>;

export type PersonalIntelligenceSnapshot = Readonly<{
  state: PersonalState;
  signals: ReadonlyArray<PersonalSignal>;
  insights: ReadonlyArray<PersonalInsight>;
  recommendations: ReadonlyArray<PersonalRecommendation>;
  nextAction: NextAction | null;
}>;
