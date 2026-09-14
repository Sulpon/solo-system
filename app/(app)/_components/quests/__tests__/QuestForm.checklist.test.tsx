import { useState } from "react";
import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuestForm from "../QuestForm";
import { createQuestFormModel, toQuestForm, upsertQuestFromForm } from "../quest-form.utils";
import type { QuestFormModel } from "../QuestForm";
import type { Quest } from "../../../_lib/types/quest";

// Every hook QuestForm depends on (useAttributes, useGoalTree,
// useWorkoutTemplates, useEisenhowerSettings) is backed only by
// useLocalStorageState - no Supabase/auth/context provider needed to mount
// the real create/edit modal in jsdom.
function Harness({ initialForm }: Readonly<{ initialForm: QuestFormModel }>) {
  const [form, setForm] = useState<QuestFormModel>(initialForm);
  const [savedQuests, setSavedQuests] = useState<Quest[]>([]);

  return (
    <div>
      <QuestForm
        form={form}
        isEditing={Boolean(form.id)}
        onChange={setForm}
        onCancel={() => {}}
        onSave={() => setSavedQuests((current: Quest[]) => upsertQuestFromForm(current, form))}
      />
      <div data-testid="saved-quests">{JSON.stringify(savedQuests)}</div>
    </div>
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("QuestForm checklist exposure", () => {
  it("shows the Checklist section with None/Fixed/Modifiable directly in the create modal", () => {
    render(<Harness initialForm={createQuestFormModel()} />);

    expect(screen.getByText("No checklist for this Quest")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "None" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fixed" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Modifiable" })).toBeInTheDocument();
  });

  it("lets a user configure a checklist and save it as part of creating the Quest", async () => {
    const user = userEvent.setup();
    render(<Harness initialForm={createQuestFormModel({ title: "Finish Thesis Chapter 4", categoryId: "discipline" })} />);

    await user.click(screen.getByRole("button", { name: "Modifiable" }));

    const minimumInput = screen.getByPlaceholderText("Add a Minimum Success item");
    await user.type(minimumInput, "Analyze experiment results");
    await user.keyboard("{Enter}");
    await user.type(minimumInput, "Write Section 4.2");
    await user.keyboard("{Enter}");

    const fullInput = screen.getByPlaceholderText("Add a Full Completion item");
    for (const title of ["Write Section 4.3", "Review figures", "Proofread"]) {
      await user.type(fullInput, title);
      await user.keyboard("{Enter}");
    }

    await user.click(screen.getByRole("button", { name: "Save Quest" }));

    const saved: Quest[] = JSON.parse(screen.getByTestId("saved-quests").textContent!);
    expect(saved).toHaveLength(1);
    expect(saved[0].title).toBe("Finish Thesis Chapter 4");
    expect(saved[0].checklistMode).toBe("modifiable");
    expect(saved[0].checklist).toHaveLength(5);
    expect(saved[0].checklist?.filter((item) => item.tier === "minimum")).toHaveLength(2);
    expect(saved[0].checklist?.filter((item) => item.tier === "full")).toHaveLength(3);
  });

  it("loads an existing Quest's checklist correctly when opened in edit mode", () => {
    const quest: Quest = {
      id: "quest-1",
      title: "Finish Thesis Chapter 4",
      categoryId: "discipline",
      xp: 25,
      cadence: "daily",
      status: "active",
      checklistMode: "modifiable",
      checklist: [
        { id: "i1", title: "Analyze experiment results", completed: true, tier: "minimum" },
        { id: "i2", title: "Write Section 4.2", completed: false, tier: "minimum" },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    render(<Harness initialForm={toQuestForm(quest)} />);

    expect(screen.getByRole("button", { name: "Modifiable" })).toHaveClass("border-purple-400/60");
    expect(screen.getByText("Analyze experiment results")).toBeInTheDocument();
    expect(screen.getByText("Write Section 4.2")).toBeInTheDocument();
  });

  it("saving a Quest that never touched the checklist section leaves it in the harmless none/empty state", async () => {
    const user = userEvent.setup();
    render(<Harness initialForm={createQuestFormModel({ title: "Plain Quest", categoryId: "discipline" })} />);

    await user.click(screen.getByRole("button", { name: "Save Quest" }));

    const saved: Quest[] = JSON.parse(screen.getByTestId("saved-quests").textContent!);
    expect(saved[0].checklistMode).toBe("none");
    expect(saved[0].checklist).toEqual([]);
    expect(saved[0].title).toBe("Plain Quest");
  });
});
