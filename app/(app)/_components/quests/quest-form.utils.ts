import type { Quest, QuestChallengeConfig, QuestCompletionMetricConfig, QuestStreakMilestone } from "../../_lib/types/quest";
import { DEFAULT_QUEST_MASTERY_MULTIPLIER } from "../../_lib/engines/quest-mastery-engine";
import { CHALLENGE_LEVEL_COUNT, type QuestFormModel } from "./QuestForm";

const DEFAULT_CHALLENGE_LEVELS = [5, 7, 10, 15, 20];
const DEFAULT_CHALLENGE_LEVEL_XP = [35, 45, 55, 70, 90];

export const emptyQuestForm: QuestFormModel = {
  title: "",
  description: "",
  categoryId: "",
  xp: 25,
  cadence: "daily",
  importance: "core",
  scheduledDays: [],
  active: true,
  linkedProgressGoalId: null,
  linkedWorkoutTemplateId: null,
  useInheritedAttributeDistribution: true,
  attributeXPOverride: [],
  inheritedAttributeIds: [],
  inheritedAttributeWeights: [],
  completionMetricType: "boolean",
  completionMetricUnit: "",
  completionMetricAutoSource: false,
  challengeEnabled: false,
  challengeLevels: [...DEFAULT_CHALLENGE_LEVELS],
  challengeLevelXp: [...DEFAULT_CHALLENGE_LEVEL_XP],
  challengeRequiredStreak: 3,
  streakMilestoneInterval: 10,
  streakMilestones: [],
  masteryMultiplier: DEFAULT_QUEST_MASTERY_MULTIPLIER,
};

export function createQuestFormModel(overrides: Partial<QuestFormModel> = {}): QuestFormModel {
  return {
    ...emptyQuestForm,
    ...overrides,
  };
}

export function slugifyQuestTitle(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "quest";
}

function normalizeChallengeLevels(levels: ReadonlyArray<number> | undefined): number[] {
  const targets = (levels ?? []).map((target) => Math.max(1, Math.floor(Number(target) || 1)));

  while (targets.length < CHALLENGE_LEVEL_COUNT) {
    targets.push(DEFAULT_CHALLENGE_LEVELS[targets.length] ?? (targets[targets.length - 1] ?? 1) + 1);
  }

  return targets.slice(0, CHALLENGE_LEVEL_COUNT);
}

function normalizeChallengeLevelXp(levelXp: ReadonlyArray<number> | undefined): number[] {
  const values = (levelXp ?? []).map((xp) => Math.max(0, Math.floor(Number(xp) || 0)));

  while (values.length < CHALLENGE_LEVEL_COUNT) {
    values.push(DEFAULT_CHALLENGE_LEVEL_XP[values.length] ?? 0);
  }

  return values.slice(0, CHALLENGE_LEVEL_COUNT);
}

export function toQuestForm(quest: Quest): QuestFormModel {
  // A quest without explicit completionMetric config is displayed exactly
  // as it currently behaves - see resolveMetricType in
  // useQuestCompletionFlow.ts. Saving the form always persists an explicit
  // choice from here on.
  const inferredMetricType = quest.completionMetric?.type ?? (quest.linkedProgressGoalId ? "numeric" : "boolean");

  return {
    id: quest.id,
    title: quest.title,
    description: quest.description ?? "",
    categoryId: quest.categoryId,
    xp: quest.xp,
    cadence: quest.cadence,
    importance: quest.importance ?? "core",
    scheduledDays: [...(quest.scheduledDays ?? [])],
    active: quest.status === "active",
    linkedProgressGoalId: quest.linkedProgressGoalId ?? null,
    linkedWorkoutTemplateId: quest.linkedWorkoutTemplateId ?? null,
    useInheritedAttributeDistribution: !quest.attributeXPOverride || quest.attributeXPOverride.length === 0,
    attributeXPOverride: quest.attributeXPOverride?.map((reward) => ({
      attributeId: reward.attributeId,
      xp: reward.xp,
    })) ?? [],
    inheritedAttributeIds: quest.attributeXPOverride?.map((reward) => reward.attributeId) ?? [],
    inheritedAttributeWeights: [],
    completionMetricType: inferredMetricType,
    completionMetricUnit: quest.completionMetric?.unit ?? "",
    completionMetricAutoSource: quest.completionMetric?.autoSource === "workout-sessions",
    challengeEnabled: quest.challenge?.enabled ?? false,
    challengeLevels: normalizeChallengeLevels(quest.challenge?.levels?.map((level) => level.target)),
    challengeLevelXp: normalizeChallengeLevelXp(quest.challenge?.levels?.map((level) => level.xp ?? 0)),
    challengeRequiredStreak: quest.challenge?.requiredStreak ?? 3,
    streakMilestoneInterval: quest.streakMilestoneInterval ?? 10,
    streakMilestones: quest.streakMilestones?.map((milestone) => ({ ...milestone })) ?? [],
    masteryMultiplier: quest.masteryMultiplier ?? DEFAULT_QUEST_MASTERY_MULTIPLIER,
  };
}

function buildCompletionMetric(form: QuestFormModel): QuestCompletionMetricConfig {
  if (form.completionMetricType === "boolean") {
    return { type: "boolean" };
  }

  return {
    type: "numeric",
    unit: form.completionMetricUnit.trim() || undefined,
    autoSource: form.completionMetricAutoSource && form.linkedWorkoutTemplateId ? "workout-sessions" : undefined,
  };
}

function buildChallenge(form: QuestFormModel): QuestChallengeConfig {
  const targets = normalizeChallengeLevels(form.challengeLevels);
  const levelXp = normalizeChallengeLevelXp(form.challengeLevelXp);

  return {
    enabled: form.challengeEnabled,
    levels: targets.map((target, index) => ({ target, xp: levelXp[index] ?? 0 })),
    requiredStreak: Math.max(1, Math.floor(Number(form.challengeRequiredStreak) || 1)),
  };
}

function buildStreakMilestones(form: QuestFormModel): ReadonlyArray<QuestStreakMilestone> {
  return form.streakMilestones
    .filter((milestone) => milestone.title.trim().length > 0)
    .map((milestone) => ({ streakCount: Math.max(1, Math.floor(Number(milestone.streakCount) || 1)), title: milestone.title.trim() }));
}

export function upsertQuestFromForm(quests: ReadonlyArray<Quest>, form: QuestFormModel, now = new Date().toISOString()): Quest[] {
  const status = form.active ? "active" : "archived";
  const resolvedAttributeIds = form.inheritedAttributeIds.length > 0 ? form.inheritedAttributeIds : form.attributeXPOverride.map((reward) => reward.attributeId);
  const categoryId = resolvedAttributeIds[0] ?? form.categoryId;
  const scheduledDays = [...new Set(form.scheduledDays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort((first, second) => first - second);
  const completionMetric = buildCompletionMetric(form);
  const challenge = buildChallenge(form);
  const streakMilestones = buildStreakMilestones(form);
  const streakMilestoneInterval = Math.max(1, Math.floor(Number(form.streakMilestoneInterval) || 1));
  const masteryMultiplier = Math.max(1, Math.floor(Number(form.masteryMultiplier) || DEFAULT_QUEST_MASTERY_MULTIPLIER));

  if (form.id) {
    return quests.map((quest) =>
      quest.id === form.id
        ? {
            ...quest,
            title: form.title.trim(),
            description: form.description.trim(),
            categoryId,
            xp: form.xp,
            cadence: form.cadence,
            importance: form.importance,
            scheduledDays,
            status,
            linkedProgressGoalId: form.linkedProgressGoalId || undefined,
            linkedWorkoutTemplateId: form.linkedWorkoutTemplateId || undefined,
            attributeXPOverride: form.useInheritedAttributeDistribution ? undefined : form.attributeXPOverride,
            completionMetric,
            challenge,
            streakMilestones,
            streakMilestoneInterval,
            masteryMultiplier,
            updatedAt: now,
          }
        : quest,
    );
  }

  const id = `${slugifyQuestTitle(form.title)}-${Date.now()}`;

  return [
    ...quests,
    {
      id,
      title: form.title.trim(),
      description: form.description.trim(),
      categoryId,
      xp: form.xp,
      cadence: form.cadence,
      importance: form.importance,
      scheduledDays,
      status,
      linkedProgressGoalId: form.linkedProgressGoalId || undefined,
      linkedWorkoutTemplateId: form.linkedWorkoutTemplateId || undefined,
      attributeXPOverride: form.useInheritedAttributeDistribution ? undefined : form.attributeXPOverride,
      completionMetric,
      challenge,
      streakMilestones,
      streakMilestoneInterval,
      masteryMultiplier,
      createdAt: now,
      updatedAt: now,
    },
  ];
}
