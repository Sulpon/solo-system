import { flattenGoalTree } from "../goal-tree-storage";
import { getGoalRelationships, getQuestRelationships, getSkillRelationships } from "../relationships";
import { getLocalDayKey } from "../local-day";
import { daysBetween, countConsecutiveDaysFromToday } from "../intelligence/signal-engine";
import type { GoalTree, GoalNode } from "../types/goal-tree";
import type { Quest, QuestCompletion } from "../types/quest";
import type { Note } from "../types/note";
import type { MediaItem } from "../types/media-item";
import type { Category } from "../types/category";
import type { FocusHistoryEntry } from "../types/focus";
import type { ActivityEvent, ActivityEventType } from "../types/activity-event";
import type { RelatedEntityGroup } from "../relationships";
import type { AchievementEvidence, AchievementMoment, AchievementMomentType } from "./types";

// Phase 12's Detection + Evidence layer - pure, deterministic functions over
// real Atlas data. Reuses the relationship layer (getGoalRelationships/
// getQuestRelationships) and Phase 11's signal-engine helpers
// (daysBetween/countConsecutiveDaysFromToday) rather than re-deriving
// goal-tree traversal or streak math. Every detector below only fires when
// real evidence exists (see each function's gate); "no moment" is always a
// valid outcome.

export type AchievementEngineInput = Readonly<{
  now: Date;
  goalTree: GoalTree;
  quests: ReadonlyArray<Quest>;
  completions: ReadonlyArray<QuestCompletion>;
  notes: ReadonlyArray<Note>;
  libraryItems: ReadonlyArray<MediaItem>;
  attributes: ReadonlyArray<Category>;
  focusHistory: ReadonlyArray<FocusHistoryEntry>;
  activityEvents: ReadonlyArray<ActivityEvent>;
}>;

// Detection is scoped to recent activity - an accurate-but-ancient "first"
// from years ago isn't useful to surface today, and bounding the window
// keeps every scan small (Step 23 performance).
const RECENT_WINDOW_DAYS = 30;

type SignificanceComponents = Readonly<{
  importance: number;
  difficulty: number;
  rarity: number;
  improvement: number;
  consistency: number;
}>;

// Transparent weighted significance score (Step 4), same documented-weight
// pattern as recommendation-engine.ts's scoring. Each detector below
// populates only the components it has real evidence for; everything else
// defaults to 0.
const SIGNIFICANCE_WEIGHTS = { importance: 0.25, difficulty: 0.2, rarity: 0.2, improvement: 0.2, consistency: 0.15 } as const;

export function scoreSignificance(components: SignificanceComponents): number {
  const raw =
    components.importance * SIGNIFICANCE_WEIGHTS.importance +
    components.difficulty * SIGNIFICANCE_WEIGHTS.difficulty +
    components.rarity * SIGNIFICANCE_WEIGHTS.rarity +
    components.improvement * SIGNIFICANCE_WEIGHTS.improvement +
    components.consistency * SIGNIFICANCE_WEIGHTS.consistency;
  return Math.round(raw * 100);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function isGoalImportant(node: GoalNode, linkedQuests: ReadonlyArray<Quest>): boolean {
  return node.type === "dream" || node.type === "long_term_goal" || Boolean(node.periodEnd) || linkedQuests.some((quest) => quest.importance === "core");
}

function getLinkedQuestsForGoal(goalId: string, input: AchievementEngineInput): ReadonlyArray<Quest> {
  const groups = getGoalRelationships(goalId, input.goalTree, input.quests, input.notes, input.libraryItems, input.attributes, input.activityEvents);
  const questsGroup = groups.find((group) => group.label === "Quests");
  const linkedIds = new Set((questsGroup?.entities ?? []).map((entity) => entity.id));
  return input.quests.filter((quest) => linkedIds.has(quest.id));
}

// Related context for a goal-scoped moment, reusing the SAME relationship
// query the "Connected" panel already renders - never a second graph.
// `groups` is handed straight to RelatedEntitiesPanel by the UI; `ids` is a
// flat id set for internal use (testing, "does this moment touch entity X").
function relatedContextForGoal(node: GoalNode, linkedQuests: ReadonlyArray<Quest>, input: AchievementEngineInput): Readonly<{ ids: string[]; groups: RelatedEntityGroup[] }> {
  const groups = getGoalRelationships(node.id, input.goalTree, input.quests, input.notes, input.libraryItems, input.attributes, input.activityEvents);
  const ids = new Set<string>([node.id, ...linkedQuests.map((quest) => quest.id)]);
  for (const group of groups) {
    for (const entity of group.entities) {
      ids.add(entity.id);
    }
  }
  return { ids: Array.from(ids), groups };
}

function buildMoment(
  type: AchievementMomentType,
  id: string,
  title: string,
  explanation: string,
  evidence: ReadonlyArray<AchievementEvidence>,
  components: SignificanceComponents,
  related: Readonly<{ ids: ReadonlyArray<string>; groups: ReadonlyArray<RelatedEntityGroup> }>,
  timestamp: string,
  extra: Readonly<{ subtitle?: string; xpAwarded?: number }> = {},
): AchievementMoment {
  return {
    id,
    type,
    title,
    subtitle: extra.subtitle,
    explanation,
    evidence,
    significance: scoreSignificance(components),
    confidence: clamp01(evidence.length / 3),
    relatedEntityIds: related.ids,
    relatedGroups: related.groups,
    xpAwarded: extra.xpAwarded,
    timestamp,
  };
}

// ---- Firsts -----------------------------------------------------------------

export function detectFirstMoments(input: AchievementEngineInput): AchievementMoment[] {
  const moments: AchievementMoment[] = [];

  for (const node of input.goalTree) {
    const linkedQuests = getLinkedQuestsForGoal(node.id, input);
    const linkedQuestIds = new Set(linkedQuests.map((quest) => quest.id));
    if (linkedQuestIds.size === 0) continue;

    const goalCompletions = input.completions.filter((completion) => linkedQuestIds.has(completion.questId));
    if (goalCompletions.length !== 1) continue;

    const completion = goalCompletions[0];
    if (daysBetween(input.now, completion.completedAt) >= RECENT_WINDOW_DAYS) continue;

    const quest = input.quests.find((item) => item.id === completion.questId);
    const evidence: AchievementEvidence[] = [{ type: "first_completion", sourceId: completion.id, label: "First completed Quest for this Goal", value: quest?.title }];

    moments.push(
      buildMoment(
        "first",
        `first:goal:${node.id}:${completion.id}`,
        `First step on ${node.title}`,
        `This was the first completed Quest linked to ${node.title}.`,
        evidence,
        { importance: isGoalImportant(node, linkedQuests) ? 1 : 0.5, difficulty: 0, rarity: 1, improvement: 0, consistency: 0 },
        relatedContextForGoal(node, linkedQuests, input),
        completion.completedAt,
      ),
    );
  }

  for (const attribute of input.attributes) {
    const linkedQuests = input.quests.filter((quest) => quest.categoryId === attribute.id);
    const linkedQuestIds = new Set(linkedQuests.map((quest) => quest.id));
    if (linkedQuestIds.size === 0) continue;

    const skillCompletions = input.completions.filter((completion) => linkedQuestIds.has(completion.questId));
    if (skillCompletions.length !== 1) continue;

    const completion = skillCompletions[0];
    if (daysBetween(input.now, completion.completedAt) >= RECENT_WINDOW_DAYS) continue;

    const quest = input.quests.find((item) => item.id === completion.questId);
    const evidence: AchievementEvidence[] = [{ type: "first_completion", sourceId: completion.id, label: "First completed Quest for this Skill", value: quest?.title }];
    const skillGroups = getSkillRelationships(attribute.id, input.goalTree, input.quests, input.notes, input.libraryItems);
    const skillRelatedIds = [attribute.id, ...linkedQuests.map((linkedQuest) => linkedQuest.id), ...skillGroups.flatMap((group) => group.entities.map((entity) => entity.id))];

    moments.push(
      buildMoment(
        "first",
        `first:skill:${attribute.id}:${completion.id}`,
        `First step in ${attribute.name}`,
        `This was the first completed Quest tagged with ${attribute.name}.`,
        evidence,
        // Skills carry no explicit importance flag (unlike Goals'
        // dream/long_term_goal/periodEnd/core-quest signals) - starting a
        // new Skill area is itself inherently notable, so this stays a
        // fixed, documented value rather than 0 or a guessed heuristic.
        { importance: 0.8, difficulty: 0, rarity: 1, improvement: 0, consistency: 0 },
        { ids: skillRelatedIds, groups: skillGroups },
        completion.completedAt,
      ),
    );
  }

  return moments;
}

// ---- Consistency --------------------------------------------------------------

const CONSISTENCY_THRESHOLDS: ReadonlyArray<number> = [7, 14, 30, 60, 100];

// Every named threshold (including the lowest, 7 days) is a real, named
// milestone worth crossing 0.6-1.0 on rarity and 0.3-1.0 on consistency -
// "do not assume a streak is meaningful simply because the number is
// large" (Step 3) cuts both ways: a named threshold is inherently
// meaningful regardless of how low it is, not scaled down just because a
// higher one also exists.
function consistencyTierComponents(streak: number): Readonly<{ rarity: number; consistency: number }> {
  const tierIndex = CONSISTENCY_THRESHOLDS.indexOf(streak);
  const tierFraction = (tierIndex + 1) / CONSISTENCY_THRESHOLDS.length;
  return { rarity: 0.6 + tierFraction * 0.4, consistency: 0.3 + tierFraction * 0.7 };
}

export function detectConsistencyMoments(input: AchievementEngineInput): AchievementMoment[] {
  const moments: AchievementMoment[] = [];

  for (const node of input.goalTree) {
    const linkedQuests = getLinkedQuestsForGoal(node.id, input);
    const linkedQuestIds = new Set(linkedQuests.map((quest) => quest.id));
    if (linkedQuestIds.size === 0) continue;

    const goalCompletions = input.completions
      .filter((completion) => linkedQuestIds.has(completion.questId))
      .sort((first, second) => new Date(second.completedAt).getTime() - new Date(first.completedAt).getTime());
    if (goalCompletions.length === 0) continue;
    const latest = goalCompletions[0];
    if (daysBetween(input.now, latest.completedAt) >= RECENT_WINDOW_DAYS) continue;

    const dayKeys = new Set(goalCompletions.map((completion) => getLocalDayKey(completion.completedAt)));
    const streak = countConsecutiveDaysFromToday(dayKeys, input.now);
    if (!CONSISTENCY_THRESHOLDS.includes(streak)) continue;

    const evidence: AchievementEvidence[] = [{ type: "streak", sourceId: latest.id, label: `${streak} consecutive execution days`, value: String(streak) }];
    const tier = consistencyTierComponents(streak);

    moments.push(
      buildMoment(
        "consistency",
        `consistency:${node.id}:${streak}:${latest.id}`,
        `${streak}-day streak on ${node.title}`,
        `You've executed on ${node.title} for ${streak} consecutive days.`,
        evidence,
        { importance: isGoalImportant(node, linkedQuests) ? 1 : 0.5, difficulty: 0, rarity: tier.rarity, improvement: 0, consistency: tier.consistency },
        relatedContextForGoal(node, linkedQuests, input),
        latest.completedAt,
      ),
    );
  }

  return moments;
}

// ---- Comeback -----------------------------------------------------------------

const COMEBACK_THRESHOLD_DAYS = 10;

export function detectComebackMoments(input: AchievementEngineInput): AchievementMoment[] {
  const moments: AchievementMoment[] = [];

  for (const node of input.goalTree) {
    const linkedQuests = getLinkedQuestsForGoal(node.id, input);
    const linkedQuestIds = new Set(linkedQuests.map((quest) => quest.id));
    if (linkedQuestIds.size === 0) continue;

    const goalCompletions = input.completions
      .filter((completion) => linkedQuestIds.has(completion.questId))
      .sort((first, second) => new Date(first.completedAt).getTime() - new Date(second.completedAt).getTime());
    // A comeback is a genuine BREAK-AND-RESUME - it requires a real prior
    // completion to resume from. Without one, a large gap just means this
    // is the goal's first-ever completion (the "first" pattern's job, not
    // comeback's) - falling back to node.createdAt here would make every
    // first completion also register as a comeback.
    if (goalCompletions.length < 2) continue;

    const latest = goalCompletions[goalCompletions.length - 1];
    if (daysBetween(input.now, latest.completedAt) >= RECENT_WINDOW_DAYS) continue;

    const previous = goalCompletions[goalCompletions.length - 2];
    const gapDays = Math.floor((new Date(latest.completedAt).getTime() - new Date(previous.completedAt).getTime()) / 86_400_000);
    if (gapDays < COMEBACK_THRESHOLD_DAYS) continue;

    const frictionDuring = input.focusHistory.filter(
      (entry) => entry.linkedQuestId && linkedQuestIds.has(entry.linkedQuestId) && !entry.completedQuest && new Date(entry.start).getTime() > new Date(previous.completedAt).getTime() && new Date(entry.start).getTime() < new Date(latest.completedAt).getTime(),
    );

    const evidence: AchievementEvidence[] = [{ type: "gap_days", sourceId: latest.id, label: `${gapDays} days since the previous execution`, value: String(gapDays) }];
    if (frictionDuring.length > 0) {
      evidence.push({ type: "friction_history", sourceId: frictionDuring[0].id, label: `${frictionDuring.length} abandoned session${frictionDuring.length === 1 ? "" : "s"} during the gap`, value: String(frictionDuring.length) });
    }

    moments.push(
      buildMoment(
        "comeback",
        `comeback:${node.id}:${latest.id}`,
        `Comeback on ${node.title}`,
        `This was your first execution on ${node.title} in ${gapDays} days.`,
        evidence,
        { importance: isGoalImportant(node, linkedQuests) ? 1 : 0.5, difficulty: frictionDuring.length > 0 ? 0.7 : 0.3, rarity: 0.5, improvement: clamp01(gapDays / 30), consistency: 0 },
        relatedContextForGoal(node, linkedQuests, input),
        latest.completedAt,
      ),
    );
  }

  return moments;
}

// ---- Breakthrough --------------------------------------------------------------

const BREAKTHROUGH_LOOKBACK = 5;
const BREAKTHROUGH_MIN_PRIOR_FAILURES = 2;

export function detectBreakthroughMoments(input: AchievementEngineInput): AchievementMoment[] {
  const moments: AchievementMoment[] = [];

  for (const quest of input.quests) {
    const questFocusHistory = input.focusHistory
      .filter((entry) => entry.linkedQuestId === quest.id && entry.mode === "quest-execution")
      .sort((first, second) => new Date(first.start).getTime() - new Date(second.start).getTime());
    if (questFocusHistory.length < 3) continue;

    const latest = questFocusHistory[questFocusHistory.length - 1];
    if (!latest.completedQuest || daysBetween(input.now, latest.start) >= RECENT_WINDOW_DAYS) continue;

    const priorEntries = questFocusHistory.slice(Math.max(0, questFocusHistory.length - 1 - BREAKTHROUGH_LOOKBACK), questFocusHistory.length - 1);
    const priorFailures = priorEntries.filter((entry) => !entry.completedQuest || entry.interrupted);
    if (priorFailures.length < BREAKTHROUGH_MIN_PRIOR_FAILURES) continue;

    const evidence: AchievementEvidence[] = [
      { type: "friction_history", sourceId: priorFailures[0].id, label: `${priorFailures.length} of the last ${priorEntries.length} sessions were interrupted or abandoned`, value: String(priorFailures.length) },
      { type: "focus_session", sourceId: latest.id, label: "This Focus Session completed successfully" },
    ];

    const questRelationshipGroups = getQuestRelationships(quest, input.goalTree, input.notes, input.libraryItems, input.attributes, input.focusHistory);
    const questRelationshipIds = questRelationshipGroups.flatMap((group) => group.entities.map((entity) => entity.id));

    moments.push(
      buildMoment(
        "breakthrough",
        `breakthrough:${quest.id}:${latest.id}`,
        `Breakthrough on ${quest.title}`,
        `You completed "${quest.title}" after it had repeatedly been interrupted or abandoned.`,
        evidence,
        { importance: quest.importance === "core" ? 1 : 0.5, difficulty: clamp01(priorFailures.length / priorEntries.length), rarity: 0.6, improvement: 0.5, consistency: 0 },
        { ids: [quest.id, ...questRelationshipIds], groups: questRelationshipGroups },
        latest.end,
      ),
    );
  }

  return moments;
}

// ---- Momentum -----------------------------------------------------------------

const MOMENTUM_COUNT = 5;
const MOMENTUM_WINDOW_DAYS = 7;

export function detectMomentumMoments(input: AchievementEngineInput): AchievementMoment[] {
  const moments: AchievementMoment[] = [];

  for (const node of input.goalTree) {
    const linkedQuests = getLinkedQuestsForGoal(node.id, input);
    const linkedQuestIds = new Set(linkedQuests.map((quest) => quest.id));
    if (linkedQuestIds.size === 0) continue;

    const goalCompletions = input.completions
      .filter((completion) => linkedQuestIds.has(completion.questId))
      .sort((first, second) => new Date(first.completedAt).getTime() - new Date(second.completedAt).getTime());
    if (goalCompletions.length < MOMENTUM_COUNT) continue;

    const latest = goalCompletions[goalCompletions.length - 1];
    if (daysBetween(input.now, latest.completedAt) >= RECENT_WINDOW_DAYS) continue;

    const latestTime = new Date(latest.completedAt).getTime();
    const windowMs = MOMENTUM_WINDOW_DAYS * 86_400_000;
    const countInWindow = goalCompletions.filter((completion) => latestTime - new Date(completion.completedAt).getTime() <= windowMs).length;
    if (countInWindow < MOMENTUM_COUNT) continue;

    // Only fire on the exact completion that crossed the threshold - without
    // this, every completion after the 5th would re-fire the same moment.
    const withoutLatest = goalCompletions.slice(0, -1);
    const countBeforeLatest = withoutLatest.filter((completion) => latestTime - new Date(completion.completedAt).getTime() <= windowMs).length;
    if (countBeforeLatest >= MOMENTUM_COUNT) continue;

    const evidence: AchievementEvidence[] = [{ type: "completion_count", sourceId: latest.id, label: `${countInWindow} Quests completed in the last ${MOMENTUM_WINDOW_DAYS} days`, value: String(countInWindow) }];

    moments.push(
      buildMoment(
        "momentum",
        `momentum:${node.id}:${latest.id}`,
        `Momentum on ${node.title}`,
        `You've completed ${countInWindow} Quests linked to ${node.title} in the last ${MOMENTUM_WINDOW_DAYS} days.`,
        evidence,
        { importance: isGoalImportant(node, linkedQuests) ? 1 : 0.5, difficulty: 0, rarity: 0.5, improvement: 0.3, consistency: clamp01(countInWindow / 8) },
        relatedContextForGoal(node, linkedQuests, input),
        latest.completedAt,
      ),
    );
  }

  return moments;
}

// ---- Milestone (enrichment of existing events) --------------------------------

const MILESTONE_EVENT_TYPES: ReadonlyArray<ActivityEventType> = ["goal_completed", "dream_completed", "milestone_completed", "progress_goal_completed"];

export function detectMilestoneMoments(input: AchievementEngineInput): AchievementMoment[] {
  const moments: AchievementMoment[] = [];
  const flatGoals = flattenGoalTree(input.goalTree);

  for (const event of input.activityEvents) {
    if (!MILESTONE_EVENT_TYPES.includes(event.type) || daysBetween(input.now, event.createdAt) >= RECENT_WINDOW_DAYS) continue;

    const node = flatGoals.find((item) => item.id === event.sourceId);
    if (!node) continue;

    const linkedQuests = getLinkedQuestsForGoal(node.id, input);
    const linkedQuestIds = new Set(linkedQuests.map((quest) => quest.id));
    const priorFriction = input.focusHistory.filter(
      (entry) => entry.linkedQuestId && linkedQuestIds.has(entry.linkedQuestId) && !entry.completedQuest && new Date(entry.start).getTime() < new Date(event.createdAt).getTime(),
    );

    const evidence: AchievementEvidence[] = [{ type: "milestone_event", sourceId: event.id, label: event.title }];
    if (priorFriction.length > 0) {
      evidence.push({ type: "friction_history", sourceId: priorFriction[0].id, label: `${priorFriction.length} abandoned session${priorFriction.length === 1 ? "" : "s"} before this completion`, value: String(priorFriction.length) });
    }
    if (node.periodEnd) {
      const daysEarly = Math.floor((new Date(node.periodEnd).getTime() - new Date(event.createdAt).getTime()) / 86_400_000);
      evidence.push({ type: "deadline", sourceId: node.id, label: daysEarly >= 0 ? `${daysEarly} days ahead of the deadline` : `${Math.abs(daysEarly)} days after the deadline`, value: String(daysEarly) });
    }

    moments.push(
      buildMoment(
        "milestone",
        `milestone:${event.id}`,
        event.title,
        `${node.title} reached a real milestone.`,
        evidence,
        { importance: isGoalImportant(node, linkedQuests) ? 1 : 0.8, difficulty: priorFriction.length > 0 ? 0.6 : 0.2, rarity: 0.7, improvement: 0.3, consistency: 0 },
        relatedContextForGoal(node, linkedQuests, input),
        event.createdAt,
      ),
    );
  }

  return moments;
}
