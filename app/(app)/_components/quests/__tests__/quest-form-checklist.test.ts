import { describe, expect, it } from "vitest";
import { emptyQuestForm, toQuestForm, upsertQuestFromForm } from "../quest-form.utils";
import type { QuestFormModel } from "../QuestForm";
import type { Quest } from "../../../_lib/types/quest";

function baseQuest(overrides: Partial<Quest> = {}): Quest {
  return {
    id: "quest-1",
    title: "Finish Thesis Chapter 4",
    categoryId: "discipline",
    xp: 25,
    cadence: "daily",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function baseForm(overrides: Partial<QuestFormModel> = {}): QuestFormModel {
  return { ...emptyQuestForm, title: "Finish Thesis Chapter 4", categoryId: "discipline", ...overrides };
}

describe("quest-form.utils checklist handling", () => {
  it("defaults a brand new form to no checklist", () => {
    expect(emptyQuestForm.checklistMode).toBe("none");
    expect(emptyQuestForm.checklist).toEqual([]);
    expect(emptyQuestForm.checklistTemplateId).toBeNull();
  });

  it("loads an existing checklist into the form in edit mode", () => {
    const quest = baseQuest({
      checklistMode: "modifiable",
      checklist: [
        { id: "i1", title: "Analyze experiment results", completed: true, tier: "minimum" },
        { id: "i2", title: "Write Section 4.2", completed: false, tier: "minimum" },
        { id: "i3", title: "Write Section 4.3", completed: false, tier: "full" },
      ],
      checklistTemplateId: null,
    });

    const form = toQuestForm(quest);

    expect(form.checklistMode).toBe("modifiable");
    expect(form.checklist).toHaveLength(3);
    expect(form.checklist[0]).toEqual({ id: "i1", title: "Analyze experiment results", completed: true, tier: "minimum" });
    expect(form.checklist.filter((item) => item.tier === "minimum")).toHaveLength(2);
    expect(form.checklist.filter((item) => item.tier === "full")).toHaveLength(1);
  });

  it("loads a Fixed-mode checklist with its template link into the form", () => {
    const quest = baseQuest({
      checklistMode: "fixed",
      checklist: [{ id: "i1", title: "Warm up", completed: false, tier: "minimum" }],
      checklistTemplateId: "template-1",
    });

    const form = toQuestForm(quest);

    expect(form.checklistMode).toBe("fixed");
    expect(form.checklistTemplateId).toBe("template-1");
  });

  it("defaults to none/empty for a legacy quest that never had checklist fields", () => {
    const quest = baseQuest();

    const form = toQuestForm(quest);

    expect(form.checklistMode).toBe("none");
    expect(form.checklist).toEqual([]);
    expect(form.checklistTemplateId).toBeNull();
  });

  it("copies checklist items into the form rather than sharing references (defensive copy)", () => {
    const originalItem = { id: "i1", title: "Warm up", completed: false, tier: "minimum" as const };
    const quest = baseQuest({ checklistMode: "modifiable", checklist: [originalItem] });

    const form = toQuestForm(quest);

    expect(form.checklist[0]).toEqual(originalItem);
    expect(form.checklist[0]).not.toBe(originalItem);
    expect(form.checklist).not.toBe(quest.checklist);
  });

  it("persists a Modifiable checklist with minimum/full tiers on create", () => {
    const form = baseForm({
      checklistMode: "modifiable",
      checklist: [
        { id: "i1", title: "Analyze experiment results", completed: false, tier: "minimum" },
        { id: "i2", title: "Write Section 4.2", completed: false, tier: "minimum" },
        { id: "i3", title: "Write Section 4.3", completed: false, tier: "full" },
        { id: "i4", title: "Review figures", completed: false, tier: "full" },
        { id: "i5", title: "Proofread", completed: false, tier: "full" },
      ],
    });

    const [saved] = upsertQuestFromForm([], form);

    expect(saved.checklistMode).toBe("modifiable");
    expect(saved.checklist).toHaveLength(5);
    expect(saved.checklist?.filter((item) => item.tier === "minimum")).toHaveLength(2);
    expect(saved.checklist?.filter((item) => item.tier === "full")).toHaveLength(3);
  });

  it("persists a Fixed checklist and its template id on create", () => {
    const form = baseForm({
      checklistMode: "fixed",
      checklist: [{ id: "i1", title: "Warm up", completed: false, tier: "minimum" }],
      checklistTemplateId: "template-1",
    });

    const [saved] = upsertQuestFromForm([], form);

    expect(saved.checklistMode).toBe("fixed");
    expect(saved.checklistTemplateId).toBe("template-1");
  });

  it("persists checklist edits made in the form when saving an edit", () => {
    const quest = baseQuest({ checklistMode: "none", checklist: [] });
    const form = toQuestForm(quest);
    const editedForm: QuestFormModel = {
      ...form,
      checklistMode: "modifiable",
      checklist: [{ id: "new-1", title: "New item", completed: false, tier: "minimum" }],
    };

    const [saved] = upsertQuestFromForm([quest], editedForm);

    expect(saved.checklistMode).toBe("modifiable");
    expect(saved.checklist).toEqual([{ id: "new-1", title: "New item", completed: false, tier: "minimum" }]);
  });

  it("leaves a no-checklist quest's other fields unaffected when saved untouched", () => {
    const quest = baseQuest({ description: "Some description", xp: 40 });
    const form = toQuestForm(quest);

    const [saved] = upsertQuestFromForm([quest], form);

    expect(saved.checklistMode).toBe("none");
    expect(saved.checklist).toEqual([]);
    expect(saved.title).toBe(quest.title);
    expect(saved.xp).toBe(40);
    expect(saved.description).toBe("Some description");
  });

  it("switching checklist mode alone does not delete existing checklist items", () => {
    const quest = baseQuest({
      checklistMode: "modifiable",
      checklist: [{ id: "i1", title: "Keep me", completed: true, tier: "minimum" }],
    });
    const form = toQuestForm(quest);
    // Simulates only the mode button being pressed (None), exactly what
    // ChecklistEditor's setMode does - it never touches `checklist`.
    const modeOnlyChange: QuestFormModel = { ...form, checklistMode: "none" };

    const [saved] = upsertQuestFromForm([quest], modeOnlyChange);

    expect(saved.checklistMode).toBe("none");
    expect(saved.checklist).toEqual([{ id: "i1", title: "Keep me", completed: true, tier: "minimum" }]);
  });
});
