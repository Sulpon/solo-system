import { flattenGoalTree } from "../goal-tree-storage";
import { getGoalRelationships, getSkillRelationships } from "../relationships";
import { getQuestDetailStats } from "../engines/quest-calendar-engine";
import type { GoalTree } from "../types/goal-tree";
import type { Quest, QuestCompletion } from "../types/quest";
import type { Note } from "../types/note";
import type { MediaItem } from "../types/media-item";
import type { Category } from "../types/category";
import type { FocusHistoryEntry } from "../types/focus";
import type { ActivityEvent } from "../types/activity-event";
import type { AchievementMoment } from "../achievements/types";
import type { MemoryEvidence, PersonalMemory } from "./types";

// Phase 13's Extraction layer - pure, deterministic functions over real
// Atlas data. Every extractor only produces a memory when real, sufficient
// evidence exists (see each function's gate); this is deliberately narrow -
// "do not turn everything into memory" (Step 9). Facts/Goals reuse the
// relationship layer for context; Experiences/Lessons reuse Achievement
// Intelligence (Phase 12) directly rather than re-deriving significance.

export type MemoryEngineInput = Readonly<{
  now: Date;
  goalTree: GoalTree;
  quests: ReadonlyArray<Quest>;
  completions: ReadonlyArray<QuestCompletion>;
  notes: ReadonlyArray<Note>;
  libraryItems: ReadonlyArray<MediaItem>;
  attributes: ReadonlyArray<Category>;
  focusHistory: ReadonlyArray<FocusHistoryEntry>;
  activityEvents: ReadonlyArray<ActivityEvent>;
  achievementMoments: ReadonlyArray<AchievementMoment>;
}>;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

// ---- Facts & Goals/Intentions (explicit) -----------------------------------

// Skills are stable, user-defined facts - Atlas has a legitimate source
// (the user created the Attribute), so these are "explicit," not inferred.
// No degree/major/sensitive-attribute guessing - only what Atlas actually
// has a real source for.
export function extractFactMemories(input: MemoryEngineInput): PersonalMemory[] {
  const memories: PersonalMemory[] = [];
  const nowIso = input.now.toISOString();

  for (const attribute of input.attributes) {
    const groups = getSkillRelationships(attribute.id, input.goalTree, input.quests, input.notes, input.libraryItems);
    memories.push({
      id: `fact:skill:${attribute.id}`,
      type: "fact",
      origin: "explicit",
      label: attribute.name,
      content: `${attribute.name} is a Skill you track in Atlas.`,
      evidence: [{ type: "skill_defined", sourceId: attribute.id, label: `${attribute.name} defined as a tracked Skill` }],
      confidence: 1,
      importance: 0.4,
      relatedEntityIds: [attribute.id, ...groups.flatMap((group) => group.entities.map((entity) => entity.id))],
      relatedGroups: groups,
      createdAt: nowIso,
      updatedAt: nowIso,
      lastRelevantAt: nowIso,
    });
  }

  return memories;
}

// Dreams/long-term Goals the user is currently pursuing - reuses the Goal
// Tree directly (never a second Goal system); "goal" memories are just a
// queryable reflection of what's already authoritative there.
export function extractGoalIntentionMemories(input: MemoryEngineInput): PersonalMemory[] {
  const memories: PersonalMemory[] = [];

  for (const node of input.goalTree) {
    if ((node.type !== "dream" && node.type !== "long_term_goal") || node.status === "completed") continue;

    const groups = getGoalRelationships(node.id, input.goalTree, input.quests, input.notes, input.libraryItems, input.attributes, input.activityEvents);
    memories.push({
      id: `goal:${node.id}`,
      type: "goal",
      origin: "explicit",
      label: node.title,
      content: `${node.title} is a Goal you are currently pursuing.`,
      evidence: [{ type: "goal_active", sourceId: node.id, label: `${node.title} is ${Math.round(node.progress)}% complete`, value: `${Math.round(node.progress)}%` }],
      confidence: 1,
      importance: node.type === "dream" ? 0.8 : 0.6,
      relatedEntityIds: [node.id, ...groups.flatMap((group) => group.entities.map((entity) => entity.id))],
      relatedGroups: groups,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
      lastRelevantAt: node.updatedAt,
    });
  }

  return memories;
}

// ---- Patterns & Preferences (derived) --------------------------------------

type TimeBucket = "morning" | "afternoon" | "evening" | "night";

function bucketForHour(hour: number): TimeBucket {
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

function dominantBucket(entries: ReadonlyArray<FocusHistoryEntry>): Readonly<{ bucket: TimeBucket; count: number }> {
  const counts = new Map<TimeBucket, number>();
  for (const entry of entries) {
    const bucket = bucketForHour(new Date(entry.start).getHours());
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  const sorted = Array.from(counts.entries()).sort((first, second) => second[1] - first[1]);
  return { bucket: sorted[0][0], count: sorted[0][1] };
}

const WORKING_TIME_MIN_SAMPLE = 8;
const WORKING_TIME_MIN_CONSISTENCY = 0.5;
const WORKING_TIME_PREFERENCE_MIN_SAMPLE = 12;
const WORKING_TIME_PREFERENCE_MIN_CONSISTENCY = 0.7;
const WORKING_TIME_RECENT_WINDOW = 10;

// Step 7's own worked example: derives a working-time tendency, and - when
// recent sessions diverge from the historical majority - surfaces BOTH
// readings instead of silently keeping only the older or newer one.
// Crosses into "preference" (vs. the lower-bar "pattern") only with
// strong, repeated, consistent evidence (Step 2's explicit requirement).
export function extractWorkingTimeMemory(input: MemoryEngineInput): PersonalMemory | null {
  const sessions = input.focusHistory.filter((entry) => !entry.interrupted);
  if (sessions.length < WORKING_TIME_MIN_SAMPLE) return null;

  const { bucket: historicalBucket, count: historicalCount } = dominantBucket(sessions);
  const consistency = historicalCount / sessions.length;
  if (consistency < WORKING_TIME_MIN_CONSISTENCY) return null;

  const byRecency = [...sessions].sort((first, second) => new Date(second.start).getTime() - new Date(first.start).getTime());
  const byAge = [...sessions].sort((first, second) => new Date(first.start).getTime() - new Date(second.start).getTime());
  const recentSessions = byRecency.slice(0, Math.min(WORKING_TIME_RECENT_WINDOW, sessions.length));
  const { bucket: recentBucket, count: recentCount } = dominantBucket(recentSessions);
  const recentConsistency = recentCount / recentSessions.length;
  const diverges = recentBucket !== historicalBucket && recentConsistency >= WORKING_TIME_MIN_CONSISTENCY;

  const confidence = clamp01((sessions.length / 20) * consistency);
  const isPreference = consistency >= WORKING_TIME_PREFERENCE_MIN_CONSISTENCY && sessions.length >= WORKING_TIME_PREFERENCE_MIN_SAMPLE;

  const evidence: MemoryEvidence[] = [
    { type: "time_distribution", sourceId: byAge[0].id, label: `${historicalCount} of ${sessions.length} sessions occurred in the ${historicalBucket}`, value: `${Math.round(consistency * 100)}%` },
  ];

  const content = diverges
    ? `Historically, most Focus Sessions occurred in the ${historicalBucket}, but recent sessions show a shift toward the ${recentBucket}.`
    : `Most successful Focus Sessions have occurred in the ${historicalBucket}.`;

  return {
    id: "pattern:working-time",
    type: isPreference ? "preference" : "pattern",
    origin: "derived",
    label: "Working Time",
    content,
    evidence,
    confidence,
    importance: 0.5,
    relatedEntityIds: [],
    relatedGroups: [],
    createdAt: byAge[0].start,
    updatedAt: byRecency[0].start,
    lastRelevantAt: byRecency[0].start,
    contradiction: diverges
      ? {
          note: `Recent activity (last ${recentSessions.length} sessions) shows ${Math.round(recentConsistency * 100)}% in the ${recentBucket}, diverging from the historical ${historicalBucket} majority.`,
          recentEvidence: [{ type: "recent_time_distribution", sourceId: recentSessions[0].id, label: `${recentCount} of ${recentSessions.length} recent sessions occurred in the ${recentBucket}`, value: `${Math.round(recentConsistency * 100)}%` }],
        }
      : undefined,
  };
}

const ABANDONMENT_MIN_SAMPLE = 5;
const ABANDONMENT_THRESHOLD = 0.4;

// "User frequently abandons a particular type of Quest" - scoped by Skill/
// category since that's the real, stable grouping Atlas already has
// (Quest.categoryId), not an invented taxonomy.
export function extractAbandonmentPatterns(input: MemoryEngineInput): PersonalMemory[] {
  const memories: PersonalMemory[] = [];

  for (const attribute of input.attributes) {
    const categoryQuestIds = new Set(input.quests.filter((quest) => quest.categoryId === attribute.id).map((quest) => quest.id));
    if (categoryQuestIds.size === 0) continue;

    const sessions = input.focusHistory.filter((entry) => entry.linkedQuestId && categoryQuestIds.has(entry.linkedQuestId) && entry.mode === "quest-execution");
    if (sessions.length < ABANDONMENT_MIN_SAMPLE) continue;

    const abandoned = sessions.filter((entry) => !entry.completedQuest);
    const rate = abandoned.length / sessions.length;
    if (rate < ABANDONMENT_THRESHOLD) continue;

    const byAge = [...sessions].sort((first, second) => new Date(first.start).getTime() - new Date(second.start).getTime());
    const byRecency = [...sessions].sort((first, second) => new Date(second.start).getTime() - new Date(first.start).getTime());

    memories.push({
      id: `pattern:abandonment:${attribute.id}`,
      type: "pattern",
      origin: "derived",
      label: `${attribute.name} Execution`,
      content: `${attribute.name} Quests have been abandoned in ${Math.round(rate * 100)}% of recent Focus Sessions.`,
      evidence: [{ type: "abandon_rate", sourceId: abandoned[0].id, label: `${abandoned.length} of ${sessions.length} ${attribute.name} sessions were not completed`, value: `${Math.round(rate * 100)}%` }],
      confidence: clamp01(sessions.length / 12),
      importance: 0.5,
      relatedEntityIds: [attribute.id],
      relatedGroups: [],
      createdAt: byAge[0].start,
      updatedAt: byRecency[0].start,
      lastRelevantAt: byRecency[0].start,
    });
  }

  return memories;
}

const CONSISTENT_HABIT_STREAK_THRESHOLD = 14;

// "User maintains strong consistency with a specific Habit" - reuses the
// existing Quest streak engine (getQuestDetailStats/calculateQuestStreak)
// rather than re-deriving streak math. Represents an ONGOING state ("you
// currently maintain a 14+ day streak"), distinct from Achievement
// Intelligence's one-time threshold-crossing "consistency" moment.
export function extractConsistentHabitPatterns(input: MemoryEngineInput): PersonalMemory[] {
  const memories: PersonalMemory[] = [];

  for (const quest of input.quests) {
    if (quest.kind !== "habit" || quest.status !== "active") continue;
    const stats = getQuestDetailStats(quest, input.completions, input.now);
    if (stats.currentStreak < CONSISTENT_HABIT_STREAK_THRESHOLD) continue;

    const nowIso = input.now.toISOString();
    memories.push({
      id: `pattern:consistent-habit:${quest.id}`,
      type: "pattern",
      origin: "derived",
      label: quest.title,
      content: `You've maintained "${quest.title}" for ${stats.currentStreak} consecutive days.`,
      evidence: [{ type: "streak", sourceId: quest.id, label: `${stats.currentStreak}-day current streak`, value: String(stats.currentStreak) }],
      confidence: clamp01(stats.currentStreak / 60),
      importance: 0.6,
      relatedEntityIds: [quest.id],
      relatedGroups: [],
      createdAt: quest.createdAt,
      updatedAt: nowIso,
      lastRelevantAt: nowIso,
    });
  }

  return memories;
}

// ---- Experiences (reuse Achievement Intelligence) --------------------------

// Same "worth interrupting the user for" bar Notification Center already
// uses (achievement-moment-engine.ts's NOTIFIABLE_SIGNIFICANCE_THRESHOLD) -
// re-declared here rather than imported to keep this module import-light;
// documented as intentionally identical.
const EXPERIENCE_SIGNIFICANCE_THRESHOLD = 55;

export function extractExperienceMemories(input: MemoryEngineInput): PersonalMemory[] {
  return input.achievementMoments
    .filter((moment) => moment.significance >= EXPERIENCE_SIGNIFICANCE_THRESHOLD)
    .map((moment) => ({
      id: `experience:${moment.id}`,
      type: "experience" as const,
      origin: "derived" as const,
      label: moment.title,
      content: moment.explanation,
      evidence: moment.evidence,
      confidence: moment.confidence,
      importance: clamp01(moment.significance / 100),
      relatedEntityIds: moment.relatedEntityIds,
      relatedGroups: moment.relatedGroups,
      createdAt: moment.timestamp,
      updatedAt: moment.timestamp,
      lastRelevantAt: moment.timestamp,
    }));
}

// ---- Lessons (repeated, strongly-evidenced conclusions) --------------------

const LESSON_MIN_COMEBACKS = 2;

// Only ONE lesson pattern this phase, deliberately: repeated real recovery
// from inactivity on the same Goal is genuine, safe, repeated evidence
// ("you've done this before"), never a psychological claim. Scoped to
// Achievement Intelligence's own recent-activity window (comebacks older
// than ~30 days won't be visible here - see achievementMoments' own
// RECENT_WINDOW_DAYS) - a documented limitation, not a bug.
export function extractLessonMemories(input: MemoryEngineInput): PersonalMemory[] {
  const memories: PersonalMemory[] = [];
  const comebacksByGoal = new Map<string, AchievementMoment[]>();

  for (const moment of input.achievementMoments) {
    if (moment.type !== "comeback") continue;
    const goalId = moment.id.split(":")[1];
    const bucket = comebacksByGoal.get(goalId) ?? [];
    bucket.push(moment);
    comebacksByGoal.set(goalId, bucket);
  }

  const flatGoals = flattenGoalTree(input.goalTree);
  for (const [goalId, moments] of comebacksByGoal) {
    if (moments.length < LESSON_MIN_COMEBACKS) continue;
    const node = flatGoals.find((item) => item.id === goalId);
    if (!node) continue;

    const sorted = [...moments].sort((first, second) => new Date(first.timestamp).getTime() - new Date(second.timestamp).getTime());
    memories.push({
      id: `lesson:comeback:${goalId}`,
      type: "lesson",
      origin: "derived",
      label: node.title,
      content: `You've successfully returned to ${node.title} after inactivity ${moments.length} times recently.`,
      evidence: sorted.map((moment) => ({ type: "comeback_instance", sourceId: moment.id, label: moment.title })),
      confidence: clamp01(moments.length / 4),
      importance: 0.6,
      relatedEntityIds: [goalId],
      relatedGroups: [],
      createdAt: sorted[0].timestamp,
      updatedAt: sorted[sorted.length - 1].timestamp,
      lastRelevantAt: sorted[sorted.length - 1].timestamp,
    });
  }

  return memories;
}
