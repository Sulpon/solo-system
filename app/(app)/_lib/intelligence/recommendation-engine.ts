import type { Quest } from "../types/quest";
import type { PresentMomentState } from "../engines/present-moment-engine";
import type { PersonalSignal, PersonalRecommendation, RecommendationActionType } from "./types";

// Phase 11's Recommendation Engine - turns signals into CONCRETE, in-app
// actions using real Atlas mechanics (Minimum Success, Focus Session,
// scheduling, Priority Gate), never vague advice. Scoring (Step 8) is a
// transparent weighted-rules formula, not a model - every weight and
// component is named below so a reader can see exactly why one
// recommendation outranked another.

export type RecommendationEngineInput = Readonly<{
  signals: ReadonlyArray<PersonalSignal>;
  quests: ReadonlyArray<Quest>;
  presentMoment: PresentMomentState;
  availableUnscheduledMinutes: number | null;
}>;

function questTitle(quests: ReadonlyArray<Quest>, id: string | undefined): string | null {
  if (!id) return null;
  return quests.find((quest) => quest.id === id)?.title ?? null;
}

// ---- Scoring (Step 8) -------------------------------------------------------
//
// Transparent weighted rule, not a model:
//   Urgency          30%  - how time-pressured the underlying evidence is
//   Importance       25%  - how deliberately the user marked this important
//   Goal impact      20%  - whether acting on it moves a real Goal forward
//   Momentum         10%  - whether it continues an existing execution streak
//   Friction          5%  - whether it addresses recorded execution resistance
//   Available time    5%  - whether there's realistically time to act now
//   Recent context    5%  - whether it continues what the user is already doing
//
// Every component is 0-1, sourced from real signal fields (strength/
// confidence/type) or from the Present-Moment Engine's own
// availableUnscheduledMinutes - never guessed.

const SCORE_WEIGHTS = {
  urgency: 0.3,
  importance: 0.25,
  goalImpact: 0.2,
  momentum: 0.1,
  friction: 0.05,
  availableTime: 0.05,
  recentContext: 0.05,
} as const;

type ScoreComponents = Readonly<{
  urgency: number;
  importance: number;
  goalImpact: number;
  momentum: number;
  friction: number;
  availableTime: number;
  recentContext: number;
}>;

function scoreRecommendation(components: ScoreComponents): number {
  const raw =
    components.urgency * SCORE_WEIGHTS.urgency +
    components.importance * SCORE_WEIGHTS.importance +
    components.goalImpact * SCORE_WEIGHTS.goalImpact +
    components.momentum * SCORE_WEIGHTS.momentum +
    components.friction * SCORE_WEIGHTS.friction +
    components.availableTime * SCORE_WEIGHTS.availableTime +
    components.recentContext * SCORE_WEIGHTS.recentContext;
  return Math.round(raw * 100);
}

function availableTimeScore(minutes: number | null): number {
  if (minutes === null) return 0.5;
  return Math.min(1, Math.max(0, minutes / 120));
}

function buildRecommendation(
  signal: PersonalSignal,
  actionType: RecommendationActionType,
  title: string,
  reason: string,
  entityId: string | null,
  href: string | null,
  components: ScoreComponents,
): PersonalRecommendation {
  return {
    id: `recommend:${signal.id}`,
    actionType,
    title,
    reason,
    evidence: signal.evidence,
    entityId,
    href,
    priorityScore: scoreRecommendation(components),
  };
}

function fromFriction(signal: PersonalSignal, quests: ReadonlyArray<Quest>, availableMinutes: number | null): PersonalRecommendation {
  const targetTitle = questTitle(quests, signal.relatedQuestId) ?? signal.label;
  return buildRecommendation(
    signal,
    "reduce_to_minimum_success",
    `Reduce "${targetTitle}" to Minimum Success`,
    `${signal.label} is high-friction (${signal.evidence[0]}). Start a Focus Session and complete only the critical portion.`,
    signal.relatedQuestId ?? signal.entityId,
    signal.relatedQuestId ? "/quests" : "/goals",
    { urgency: signal.strength, importance: signal.confidence, goalImpact: 1, momentum: 0, friction: signal.strength, availableTime: availableTimeScore(availableMinutes), recentContext: 0.2 },
  );
}

function fromNeglect(signal: PersonalSignal, quests: ReadonlyArray<Quest>, availableMinutes: number | null): PersonalRecommendation {
  const targetTitle = questTitle(quests, signal.relatedQuestId) ?? signal.label;
  return buildRecommendation(
    signal,
    "schedule_quest",
    signal.relatedQuestId ? `Schedule "${targetTitle}" for tomorrow morning` : `Review "${signal.label}" and add a scheduled Quest`,
    `${signal.label} is important but ${signal.evidence[0].toLowerCase()}.`,
    signal.relatedQuestId ?? signal.entityId,
    signal.relatedQuestId ? "/quests" : "/goals",
    { urgency: signal.strength, importance: 0.8, goalImpact: 1, momentum: 0, friction: 0, availableTime: availableTimeScore(availableMinutes), recentContext: 0.1 },
  );
}

function fromGoalRisk(signal: PersonalSignal, quests: ReadonlyArray<Quest>, availableMinutes: number | null): PersonalRecommendation {
  const targetTitle = questTitle(quests, signal.relatedQuestId) ?? signal.label;
  return buildRecommendation(
    signal,
    signal.relatedQuestId ? "start_focus_session" : "review_goal",
    signal.relatedQuestId ? `Start a Focus Session on "${targetTitle}"` : `Review "${signal.label}"`,
    `${signal.label} is approaching its deadline: ${signal.evidence[0]}.`,
    signal.relatedQuestId ?? signal.entityId,
    signal.relatedQuestId ? "/quests" : "/goals",
    { urgency: signal.strength, importance: 0.9, goalImpact: 1, momentum: 0, friction: 0, availableTime: availableTimeScore(availableMinutes), recentContext: 0.1 },
  );
}

function fromMomentum(signal: PersonalSignal, quests: ReadonlyArray<Quest>, availableMinutes: number | null): PersonalRecommendation | null {
  const targetTitle = questTitle(quests, signal.relatedQuestId);
  if (!targetTitle) return null;
  return buildRecommendation(
    signal,
    "continue_context",
    `Continue "${targetTitle}"`,
    `${signal.label} has strong momentum (${signal.evidence[0]}). Continuing now builds on it.`,
    signal.relatedQuestId ?? null,
    "/quests",
    { urgency: 0.2, importance: 0.5, goalImpact: 0.8, momentum: signal.strength, friction: 0, availableTime: availableTimeScore(availableMinutes), recentContext: 0.4 },
  );
}

function fromCompletionMomentum(signal: PersonalSignal, availableMinutes: number | null): PersonalRecommendation {
  return buildRecommendation(
    signal,
    "continue_context",
    `Continue "${signal.label}"`,
    `${signal.explanation} ${signal.evidence[1] ?? ""}`.trim(),
    signal.entityId,
    "/quests",
    { urgency: 0.3, importance: 0.4, goalImpact: 0.4, momentum: signal.strength, friction: 0, availableTime: availableTimeScore(availableMinutes), recentContext: 1 },
  );
}

function fromOverload(signal: PersonalSignal, availableMinutes: number | null): PersonalRecommendation {
  return buildRecommendation(
    signal,
    "review_goal",
    "Review today's Priority Gate",
    `${signal.evidence[0]} - consider deferring non-critical work to tomorrow's plan.`,
    null,
    "/quests",
    { urgency: 0.6, importance: 0.5, goalImpact: 0.3, momentum: 0, friction: 0, availableTime: 1 - availableTimeScore(availableMinutes), recentContext: 0.2 },
  );
}

function fromPriorityConflict(signal: PersonalSignal, availableMinutes: number | null): PersonalRecommendation {
  return buildRecommendation(
    signal,
    "review_goal",
    `Resolve conflict: "${signal.label}"`,
    signal.explanation,
    signal.entityId,
    "/quests",
    { urgency: 0.7, importance: 0.5, goalImpact: 0.3, momentum: 0, friction: 0, availableTime: availableTimeScore(availableMinutes), recentContext: 0.3 },
  );
}

// Present-Moment Engine's own "important work complete" state, reused
// verbatim - never recomputed. Only produced when there's genuinely open
// time to suggest something into (never invented activities beyond a
// generic "open time" pointer, per Phase 11's evidence-first rule).
function fromImportantWorkComplete(presentMoment: PresentMomentState): PersonalRecommendation | null {
  if (!presentMoment.importantWorkComplete || presentMoment.availableUnscheduledMinutes === null || presentMoment.availableUnscheduledMinutes <= 0) {
    return null;
  }
  return {
    id: "recommend:important_work_complete",
    actionType: "open_time_suggestion",
    title: "Important work is complete",
    reason: `You have ${presentMoment.availableUnscheduledMinutes} minutes of open time before your next commitment.`,
    evidence: [
      "Today's Priority Gate is clear",
      presentMoment.nextCommitment ? `Next commitment: ${presentMoment.nextCommitment.title} at ${presentMoment.nextCommitment.time}` : "No further commitments scheduled today",
    ],
    entityId: null,
    href: null,
    priorityScore: scoreRecommendation({ urgency: 0.1, importance: 0.2, goalImpact: 0.1, momentum: 0, friction: 0, availableTime: availableTimeScore(presentMoment.availableUnscheduledMinutes), recentContext: 0.1 }),
  };
}

export function computeRecommendations(input: RecommendationEngineInput): PersonalRecommendation[] {
  const recommendations: PersonalRecommendation[] = [];

  for (const signal of input.signals) {
    switch (signal.type) {
      case "friction":
        recommendations.push(fromFriction(signal, input.quests, input.availableUnscheduledMinutes));
        break;
      case "neglect":
        recommendations.push(fromNeglect(signal, input.quests, input.availableUnscheduledMinutes));
        break;
      case "goal_risk":
        recommendations.push(fromGoalRisk(signal, input.quests, input.availableUnscheduledMinutes));
        break;
      case "momentum": {
        const recommendation = fromMomentum(signal, input.quests, input.availableUnscheduledMinutes);
        if (recommendation) recommendations.push(recommendation);
        break;
      }
      case "completion_momentum":
        recommendations.push(fromCompletionMomentum(signal, input.availableUnscheduledMinutes));
        break;
      case "overload":
        recommendations.push(fromOverload(signal, input.availableUnscheduledMinutes));
        break;
      case "priority_conflict":
        recommendations.push(fromPriorityConflict(signal, input.availableUnscheduledMinutes));
        break;
      case "focus_quality":
        // Informational only - no single concrete Atlas action is
        // supported by this signal alone (see insight-engine.ts); it still
        // surfaces as an insight, just not a recommendation.
        break;
    }
  }

  const importantWorkComplete = fromImportantWorkComplete(input.presentMoment);
  if (importantWorkComplete) recommendations.push(importantWorkComplete);

  return recommendations.sort((first, second) => second.priorityScore - first.priorityScore);
}
