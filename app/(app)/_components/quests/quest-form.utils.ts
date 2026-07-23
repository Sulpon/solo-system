import type { Quest } from "../../_lib/types/quest";
import type { QuestFormModel } from "./QuestForm";

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

export function toQuestForm(quest: Quest): QuestFormModel {
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
  };
}

export function upsertQuestFromForm(quests: ReadonlyArray<Quest>, form: QuestFormModel, now = new Date().toISOString()): Quest[] {
  const status = form.active ? "active" : "archived";
  const resolvedAttributeIds = form.inheritedAttributeIds.length > 0 ? form.inheritedAttributeIds : form.attributeXPOverride.map((reward) => reward.attributeId);
  const categoryId = resolvedAttributeIds[0] ?? form.categoryId;
  const scheduledDays = [...new Set(form.scheduledDays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort((first, second) => first - second);

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
      createdAt: now,
      updatedAt: now,
    },
  ];
}
