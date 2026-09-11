import { getGoalRelationships } from "../relationships";
import { getQuestScheduledDurationMinutes } from "../engines/quest-calendar-engine";
import { getLocalDayKey } from "../local-day";
import type { GoalTree, GoalNode } from "../types/goal-tree";
import type { Quest, QuestCompletion } from "../types/quest";
import type { Note } from "../types/note";
import type { MediaItem } from "../types/media-item";
import type { Category } from "../types/category";
import type { FocusHistoryEntry } from "../types/focus";
import type { ActivityEvent } from "../types/activity-event";
import type { CalendarQuestItem } from "../engines/quest-calendar-engine";
import type { PriorityGateState } from "../engines/priority-gate-engine";
import type { PersonalSignal, SignalPolarity } from "./types";

// Phase 11's Signal Engine - every function here is a PURE, deterministic
// read over data Atlas already stores. Nothing is written, nothing is
// fetched, nothing is invented: a signal is only ever returned when real
// evidence supports it (see each function's gate below); otherwise the
// function returns null and the caller emits nothing for that
// goal/quest/day, matching "Atlas must be comfortable saying I don't know."
//
// Goal-scoped signals (momentum/friction/neglect/goal_risk) reuse
// getGoalRelationships() from the existing relationship layer to find a
// goal's linked quests - this is deliberate: relationships.ts already owns
// goal-tree traversal + quest linkage, so this module never re-derives it.

export type SignalEngineInput = Readonly<{
  now: Date;
  goalTree: GoalTree;
  quests: ReadonlyArray<Quest>;
  completions: ReadonlyArray<QuestCompletion>;
  notes: ReadonlyArray<Note>;
  libraryItems: ReadonlyArray<MediaItem>;
  attributes: ReadonlyArray<Category>;
  focusHistory: ReadonlyArray<FocusHistoryEntry>;
  activityEvents: ReadonlyArray<ActivityEvent>;
  todaysCalendarItems: ReadonlyArray<CalendarQuestItem>;
  priorityGateState: PriorityGateState | null;
  // From Present-Moment Engine (presentMoment.availableUnscheduledMinutes) -
  // reused, never recomputed here.
  availableUnscheduledMinutes: number | null;
}>;

export function daysBetween(now: Date, iso: string): number {
  const diffMs = now.getTime() - new Date(iso).getTime();
  return Math.floor(diffMs / 86_400_000);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Consecutive days with at least one entry, walking back from today
// (today itself doesn't have to be present - a goal worked yesterday and
// the day before still has a 2-day streak even before today's session).
export function countConsecutiveDaysFromToday(dayKeys: ReadonlySet<string>, now: Date): number {
  let streak = 0;
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  if (!dayKeys.has(getLocalDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  for (let i = 0; i < 365; i += 1) {
    if (!dayKeys.has(getLocalDayKey(cursor))) {
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function sumFocusDurationInWindow(entries: ReadonlyArray<FocusHistoryEntry>, now: Date, minDaysAgo: number, maxDaysAgo: number): number {
  return entries
    .filter((entry) => {
      const days = daysBetween(now, entry.start);
      return days >= minDaysAgo && days < maxDaysAgo;
    })
    .reduce((sum, entry) => sum + entry.duration, 0);
}

function getLinkedQuestsForGoal(goalId: string, input: SignalEngineInput): ReadonlyArray<Quest> {
  const groups = getGoalRelationships(goalId, input.goalTree, input.quests, input.notes, input.libraryItems, input.attributes, input.activityEvents);
  const questsGroup = groups.find((group) => group.label === "Quests");
  const linkedIds = new Set((questsGroup?.entities ?? []).map((entity) => entity.id));
  return input.quests.filter((quest) => linkedIds.has(quest.id));
}

// The one concrete, active Quest a recommendation should point the user at
// for this goal - deterministically "the first active linked quest" (the
// same order getGoalRelationships already returns), never a scored/guessed
// pick.
function pickRepresentativeQuestId(linkedQuests: ReadonlyArray<Quest>): string | undefined {
  return linkedQuests.find((quest) => quest.status === "active")?.id;
}

// ---- Momentum ---------------------------------------------------------

const MOMENTUM_WINDOW_DAYS = 14;
const MOMENTUM_MIN_COMPLETIONS = 3;
const MOMENTUM_MIN_CONSECUTIVE_DAYS = 2;

function computeGoalMomentumSignal(node: GoalNode, linkedQuests: ReadonlyArray<Quest>, input: SignalEngineInput): PersonalSignal | null {
  const linkedQuestIds = new Set(linkedQuests.map((quest) => quest.id));
  if (linkedQuestIds.size === 0) {
    return null;
  }

  const recentCompletions = input.completions
    .filter((completion) => linkedQuestIds.has(completion.questId) && daysBetween(input.now, completion.completedAt) < MOMENTUM_WINDOW_DAYS)
    .sort((first, second) => new Date(second.completedAt).getTime() - new Date(first.completedAt).getTime());

  if (recentCompletions.length < MOMENTUM_MIN_COMPLETIONS) {
    return null;
  }

  const dayKeys = new Set(recentCompletions.map((completion) => getLocalDayKey(completion.completedAt)));
  const consecutiveDays = countConsecutiveDaysFromToday(dayKeys, input.now);
  if (consecutiveDays < MOMENTUM_MIN_CONSECUTIVE_DAYS) {
    return null;
  }

  const linkedFocus = input.focusHistory.filter((entry) => entry.linkedQuestId && linkedQuestIds.has(entry.linkedQuestId));
  const last7 = sumFocusDurationInWindow(linkedFocus, input.now, 0, 7);
  const prev7 = sumFocusDurationInWindow(linkedFocus, input.now, 7, 14);

  const evidence: string[] = [
    `${recentCompletions.length} completed quests in the last ${MOMENTUM_WINDOW_DAYS} days`,
    `${consecutiveDays} consecutive execution day${consecutiveDays === 1 ? "" : "s"}`,
  ];
  if (prev7 > 0 && last7 > prev7) {
    evidence.push(`Focus time increased from ${Math.round(prev7 / 60)}m to ${Math.round(last7 / 60)}m over the last week`);
  }

  return {
    id: `momentum:${node.id}`,
    type: "momentum",
    polarity: "positive",
    strength: clamp(consecutiveDays / 7, 0, 1),
    confidence: clamp(recentCompletions.length / 6, 0, 1),
    entityType: "goal",
    entityId: node.id,
    label: node.title,
    explanation: `${node.title} is progressing consistently.`,
    evidence,
    sourceIds: recentCompletions.map((completion) => completion.id),
    relatedQuestId: pickRepresentativeQuestId(linkedQuests),
  };
}

// ---- Friction -----------------------------------------------------------

const FRICTION_WINDOW_DAYS = 30;
const FRICTION_STALE_GAP_DAYS = 7;

function computeGoalFrictionSignal(node: GoalNode, linkedQuests: ReadonlyArray<Quest>, input: SignalEngineInput): PersonalSignal | null {
  if (node.status === "completed" || linkedQuests.length === 0) {
    return null;
  }

  const linkedQuestIds = new Set(linkedQuests.map((quest) => quest.id));
  const linkedFocus = input.focusHistory.filter((entry) => entry.linkedQuestId && linkedQuestIds.has(entry.linkedQuestId) && daysBetween(input.now, entry.start) < FRICTION_WINDOW_DAYS);
  const abandoned = linkedFocus.filter((entry) => !entry.completedQuest);
  const interrupted = linkedFocus.filter((entry) => entry.interrupted);

  const lastCompletion = input.completions
    .filter((completion) => linkedQuestIds.has(completion.questId))
    .sort((first, second) => new Date(second.completedAt).getTime() - new Date(first.completedAt).getTime())[0];
  const daysSinceLastCompletion = lastCompletion ? daysBetween(input.now, lastCompletion.completedAt) : null;
  // Only "stale despite scheduling" counts as friction - an unscheduled,
  // dormant goal is a neglect question, not a friction one (see
  // computeGoalNeglectSignal).
  const isActivelyScheduled = linkedQuests.some((quest) => quest.status === "active" && (Boolean(quest.scheduledDate) || (quest.scheduledDays?.length ?? 0) > 0));
  const staleGap = isActivelyScheduled && (daysSinceLastCompletion === null || daysSinceLastCompletion >= FRICTION_STALE_GAP_DAYS);

  const evidence: string[] = [];
  if (abandoned.length > 0) {
    evidence.push(`${abandoned.length} abandoned focus session${abandoned.length === 1 ? "" : "s"} in the last ${FRICTION_WINDOW_DAYS} days`);
  }
  if (interrupted.length > 0) {
    evidence.push(`${interrupted.length} interrupted focus session${interrupted.length === 1 ? "" : "s"} in the last ${FRICTION_WINDOW_DAYS} days`);
  }
  if (staleGap) {
    evidence.push(
      daysSinceLastCompletion === null
        ? "No completed quest yet despite active scheduling"
        : `No completed quest in the last ${daysSinceLastCompletion} days despite active scheduling`,
    );
  }

  if (evidence.length === 0) {
    return null;
  }

  return {
    id: `friction:${node.id}`,
    type: "friction",
    polarity: "negative",
    strength: clamp((abandoned.length + interrupted.length) / 4 + (staleGap ? 0.4 : 0), 0, 1),
    confidence: clamp((linkedFocus.length + (lastCompletion ? 1 : 0)) / 4, 0, 1),
    entityType: "goal",
    entityId: node.id,
    label: node.title,
    explanation: `${node.title} is showing repeated execution resistance.`,
    evidence,
    sourceIds: [...abandoned.map((entry) => entry.id), ...interrupted.map((entry) => entry.id)],
    relatedQuestId: pickRepresentativeQuestId(linkedQuests),
  };
}

// ---- Neglect --------------------------------------------------------------

const NEGLECT_THRESHOLD_DAYS = 10;
// A goal younger than this simply hasn't had time to be worked on yet -
// absence of activity on a brand-new goal is not neglect (see the module
// header's "do not call something neglected simply because there is no
// activity" rule).
const NEGLECT_MIN_GOAL_AGE_DAYS = 3;

function computeGoalNeglectSignal(node: GoalNode, linkedQuests: ReadonlyArray<Quest>, input: SignalEngineInput): PersonalSignal | null {
  if (node.status === "completed" || daysBetween(input.now, node.createdAt) < NEGLECT_MIN_GOAL_AGE_DAYS) {
    return null;
  }

  // "Important" is derived from real, user-set signals only - never
  // guessed: top-level life domains (dream/long_term_goal), an explicit
  // deadline the user assigned (periodEnd), or a linked Task the user
  // marked "core" importance.
  const isImportant = node.type === "dream" || node.type === "long_term_goal" || Boolean(node.periodEnd) || linkedQuests.some((quest) => quest.importance === "core");
  if (!isImportant) {
    return null;
  }

  const linkedQuestIds = new Set(linkedQuests.map((quest) => quest.id));
  const lastCompletion = input.completions
    .filter((completion) => linkedQuestIds.has(completion.questId))
    .sort((first, second) => new Date(second.completedAt).getTime() - new Date(first.completedAt).getTime())[0];
  const daysSinceLastCompletion = lastCompletion ? daysBetween(input.now, lastCompletion.completedAt) : null;

  const hasUpcomingWork = linkedQuests.some((quest) => {
    if (quest.status !== "active") return false;
    if ((quest.scheduledDays?.length ?? 0) > 0) return true;
    if (!quest.scheduledDate) return false;
    const days = daysBetween(input.now, quest.scheduledDate) * -1;
    return days >= 0 && days <= 7;
  });

  const isNeglected = (daysSinceLastCompletion === null || daysSinceLastCompletion >= NEGLECT_THRESHOLD_DAYS) && !hasUpcomingWork;
  if (!isNeglected) {
    return null;
  }

  return {
    id: `neglect:${node.id}`,
    type: "neglect",
    polarity: "negative",
    strength: clamp((daysSinceLastCompletion ?? NEGLECT_THRESHOLD_DAYS * 2) / (NEGLECT_THRESHOLD_DAYS * 2), 0, 1),
    confidence: linkedQuests.length > 0 ? 0.7 : 0.4,
    entityType: "goal",
    entityId: node.id,
    label: node.title,
    explanation: `${node.title} is important but has received little recent activity.`,
    evidence: [
      daysSinceLastCompletion === null ? "No completed quest recorded for this goal" : `No completed quest in the last ${daysSinceLastCompletion} days`,
      "No linked quest is currently scheduled",
    ],
    sourceIds: [node.id],
    relatedQuestId: pickRepresentativeQuestId(linkedQuests),
  };
}

// ---- Goal risk --------------------------------------------------------------

const RISK_HORIZON_DAYS = 30;
const RISK_PROGRESS_GAP = 15;

function computeGoalRiskSignal(node: GoalNode, linkedQuests: ReadonlyArray<Quest>, now: Date): PersonalSignal | null {
  if (!node.periodEnd || node.status === "completed") {
    return null;
  }

  const periodEnd = new Date(node.periodEnd);
  const daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / 86_400_000);
  if (daysRemaining > RISK_HORIZON_DAYS) {
    return null;
  }

  let expectedProgress: number | null = null;
  if (node.periodStart) {
    const start = new Date(node.periodStart).getTime();
    const end = periodEnd.getTime();
    if (end > start) {
      expectedProgress = clamp(((now.getTime() - start) / (end - start)) * 100, 0, 100);
    }
  }

  const gap = expectedProgress !== null ? expectedProgress - node.progress : null;
  const atRisk = daysRemaining <= 0 || (gap !== null ? gap >= RISK_PROGRESS_GAP : daysRemaining <= 14 && node.progress < 60);
  if (!atRisk) {
    return null;
  }

  const evidence: string[] = [
    daysRemaining <= 0 ? `Deadline passed ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} ago` : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining until the deadline`,
    `${Math.round(node.progress)}% complete`,
  ];
  if (expectedProgress !== null) {
    evidence.push(`Expected roughly ${Math.round(expectedProgress)}% complete by now`);
  }

  return {
    id: `goal_risk:${node.id}`,
    type: "goal_risk",
    polarity: "negative",
    strength: clamp(gap !== null ? gap / 50 : (14 - daysRemaining) / 14, 0, 1),
    confidence: node.periodStart ? 0.75 : 0.5,
    entityType: "goal",
    entityId: node.id,
    label: node.title,
    explanation: `${node.title} is approaching its deadline without sufficient progress.`,
    evidence,
    sourceIds: [node.id],
    relatedQuestId: pickRepresentativeQuestId(linkedQuests),
  };
}

// ---- Overload (today's workload) ------------------------------------------

const OVERLOAD_TASK_COUNT_THRESHOLD = 4;

function computeOverloadSignal(input: SignalEngineInput): PersonalSignal | null {
  const gate = input.priorityGateState;
  if (!gate) {
    return null;
  }

  const uncleared = gate.quadrantStatuses.filter((status) => !status.cleared);
  const totalTasks = uncleared.reduce((sum, status) => sum + status.tasks.length, 0);
  if (totalTasks === 0) {
    return null;
  }

  const scheduledMinutes = input.todaysCalendarItems
    .filter((item) => item.status !== "completed")
    .reduce((sum, item) => sum + (getQuestScheduledDurationMinutes(item.quest) ?? 0), 0);

  const overloadByCount = totalTasks >= OVERLOAD_TASK_COUNT_THRESHOLD;
  const overloadByTime = input.availableUnscheduledMinutes !== null && scheduledMinutes > input.availableUnscheduledMinutes;
  if (!overloadByCount && !overloadByTime) {
    return null;
  }

  const evidence: string[] = [`${totalTasks} uncleared priority task${totalTasks === 1 ? "" : "s"} today`];
  if (overloadByTime) {
    evidence.push(`${scheduledMinutes} minutes scheduled vs ${input.availableUnscheduledMinutes} minutes available`);
  }

  return {
    id: "overload:today",
    type: "overload",
    polarity: "negative",
    strength: clamp(totalTasks / (OVERLOAD_TASK_COUNT_THRESHOLD * 2), 0, 1),
    confidence: 0.7,
    entityType: "global",
    entityId: "today",
    label: "Today",
    explanation: "Today's important work is concentrated beyond what's likely to fit.",
    evidence,
    sourceIds: uncleared.flatMap((status) => status.tasks.map((task) => task.id)),
  };
}

// ---- Focus quality ----------------------------------------------------------

const FOCUS_QUALITY_WINDOW_DAYS = 14;
const FOCUS_QUALITY_MIN_SESSIONS = 3;

function computeFocusQualitySignal(input: SignalEngineInput): PersonalSignal | null {
  const recent = input.focusHistory.filter((entry) => entry.mode === "quest-execution" && daysBetween(input.now, entry.start) < FOCUS_QUALITY_WINDOW_DAYS);
  if (recent.length < FOCUS_QUALITY_MIN_SESSIONS) {
    return null;
  }

  const withFeedback = recent.filter((entry) => typeof entry.energyBefore === "number" && typeof entry.energyAfter === "number");
  const interruptedCount = recent.filter((entry) => entry.interrupted).length;
  const completionRate = recent.filter((entry) => entry.completedQuest).length / recent.length;
  const energyDelta = withFeedback.length > 0 ? withFeedback.reduce((sum, entry) => sum + (entry.energyAfter! - entry.energyBefore!), 0) / withFeedback.length : null;

  const polarity: SignalPolarity = completionRate >= 0.7 && interruptedCount <= 1 ? "positive" : completionRate < 0.4 || interruptedCount >= recent.length / 2 ? "negative" : "neutral";

  const evidence: string[] = [`${recent.length} quest-execution sessions in the last ${FOCUS_QUALITY_WINDOW_DAYS} days`, `${Math.round(completionRate * 100)}% completed without abandoning`];
  if (interruptedCount > 0) {
    evidence.push(`${interruptedCount} interrupted session${interruptedCount === 1 ? "" : "s"}`);
  }
  if (energyDelta !== null) {
    evidence.push(`Average energy change ${energyDelta >= 0 ? "+" : ""}${energyDelta.toFixed(1)}`);
  }

  return {
    id: "focus_quality:recent",
    type: "focus_quality",
    polarity,
    strength: polarity === "neutral" ? 0.3 : clamp(Math.abs(completionRate - 0.5) * 2, 0, 1),
    confidence: clamp(recent.length / 8, 0, 1),
    entityType: "global",
    entityId: "focus",
    label: "Focus Sessions",
    explanation: polarity === "positive" ? "Recent Focus Sessions have been completing cleanly." : polarity === "negative" ? "Recent Focus Sessions have been interrupted or abandoned often." : "Recent Focus Sessions have been mixed.",
    evidence,
    sourceIds: recent.map((entry) => entry.id),
  };
}

// ---- Completion momentum (continue the current execution context) --------

function computeCompletionMomentumSignal(input: SignalEngineInput): PersonalSignal | null {
  const todayKey = getLocalDayKey(input.now);
  const todaysCompletions = input.completions.filter((completion) => getLocalDayKey(completion.completedAt) === todayKey);
  if (todaysCompletions.length < 2) {
    return null;
  }

  const byCategory = new Map<string, QuestCompletion[]>();
  for (const completion of todaysCompletions) {
    const quest = input.quests.find((item) => item.id === completion.questId);
    if (!quest) continue;
    const bucket = byCategory.get(quest.categoryId) ?? [];
    bucket.push(completion);
    byCategory.set(quest.categoryId, bucket);
  }

  for (const [categoryId, categoryCompletions] of byCategory) {
    if (categoryCompletions.length < 2) continue;
    const completedQuestIds = new Set(categoryCompletions.map((completion) => completion.questId));
    const candidate = input.todaysCalendarItems.find((item) => item.quest.categoryId === categoryId && item.status !== "completed" && !completedQuestIds.has(item.quest.id));
    if (!candidate) continue;

    const categoryLabel = input.attributes.find((attribute) => attribute.id === categoryId)?.name ?? categoryId;
    return {
      id: `completion_momentum:${categoryId}`,
      type: "completion_momentum",
      polarity: "positive",
      strength: clamp(categoryCompletions.length / 4, 0, 1),
      confidence: clamp(categoryCompletions.length / 3, 0, 1),
      entityType: "quest",
      entityId: candidate.quest.id,
      label: candidate.quest.title,
      explanation: `You've built execution momentum in ${categoryLabel} today.`,
      evidence: [`${categoryCompletions.length} ${categoryLabel} quests completed today`, `"${candidate.quest.title}" is still scheduled today`],
      sourceIds: categoryCompletions.map((completion) => completion.id),
    };
  }

  return null;
}

// ---- Priority conflict (calendar vs. Priority Gate) ------------------------

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function computePriorityConflictSignal(input: SignalEngineInput): PersonalSignal | null {
  const quadrant = input.priorityGateState?.currentQuadrant ?? null;
  if (!quadrant) {
    return null;
  }

  const nowMinutes = input.now.getHours() * 60 + input.now.getMinutes();
  const active = input.todaysCalendarItems.find((item) => {
    if (item.status === "completed" || !item.startTime) return false;
    const start = timeToMinutes(item.startTime);
    const end = item.endTime ? timeToMinutes(item.endTime) : start + 30;
    return nowMinutes >= start && nowMinutes < end;
  });
  if (!active) {
    return null;
  }

  const activeQuadrant = active.quest.kind === "task" ? active.quest.eisenhowerQuadrant ?? null : null;
  if (activeQuadrant === quadrant) {
    return null;
  }

  return {
    id: `priority_conflict:${active.quest.id}`,
    type: "priority_conflict",
    polarity: "negative",
    strength: 0.6,
    confidence: 0.7,
    entityType: "quest",
    entityId: active.quest.id,
    label: active.quest.title,
    explanation: `The calendar has "${active.quest.title}" scheduled now, but the Priority Gate's current quadrant isn't cleared yet.`,
    evidence: [`"${active.quest.title}" is scheduled right now`, `Priority Gate is still on ${quadrant.replaceAll("_", " ")}`],
    sourceIds: [active.quest.id],
  };
}

// ---- Composition ------------------------------------------------------------

// Goal-scoped signals are only computed for TOP-LEVEL goal-tree nodes
// (input.goalTree's own entries, i.e. Dreams/long-term Goals) - not every
// descendant. getGoalRelationships already aggregates a node's full
// descendant subtree, so scoring every level too would just re-emit
// overlapping signals for the same underlying quests ("avoid arbitrary
// complexity").
export function computeAllSignals(input: SignalEngineInput): PersonalSignal[] {
  const signals: PersonalSignal[] = [];

  for (const node of input.goalTree) {
    const linkedQuests = getLinkedQuestsForGoal(node.id, input);
    const momentum = computeGoalMomentumSignal(node, linkedQuests, input);
    if (momentum) signals.push(momentum);
    const friction = computeGoalFrictionSignal(node, linkedQuests, input);
    if (friction) signals.push(friction);
    const neglect = computeGoalNeglectSignal(node, linkedQuests, input);
    if (neglect) signals.push(neglect);
    const risk = computeGoalRiskSignal(node, linkedQuests, input.now);
    if (risk) signals.push(risk);
  }

  const overload = computeOverloadSignal(input);
  if (overload) signals.push(overload);
  const focusQuality = computeFocusQualitySignal(input);
  if (focusQuality) signals.push(focusQuality);
  const completionMomentum = computeCompletionMomentumSignal(input);
  if (completionMomentum) signals.push(completionMomentum);
  const priorityConflict = computePriorityConflictSignal(input);
  if (priorityConflict) signals.push(priorityConflict);

  return signals;
}
