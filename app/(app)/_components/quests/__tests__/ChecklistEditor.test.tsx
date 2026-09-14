import { useState } from "react";
import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChecklistEditor, { type ChecklistPatch } from "../ChecklistEditor";
import type { ChecklistItem, ChecklistMode } from "../../../_lib/types/quest";

// ChecklistEditor is the real checklist-configuration UI now embedded
// directly in QuestForm.tsx's create/edit modal (Part 1 of the checklist
// UX work) - these tests exercise it exactly the way QuestForm wires it:
// a single combined onUpdate(patch) callback merged onto local state, no
// direct persistence of its own.
function Harness({ initialMode = "none" as ChecklistMode }: Readonly<{ initialMode?: ChecklistMode }>) {
  return <ControlledEditor initialMode={initialMode} />;
}

type EditorState = Readonly<{ mode: ChecklistMode; checklist: ReadonlyArray<ChecklistItem>; checklistTemplateId: string | null }>;

function ControlledEditor({ initialMode }: Readonly<{ initialMode: ChecklistMode }>) {
  const [state, setState] = useState<EditorState>({
    mode: initialMode,
    checklist: [],
    checklistTemplateId: null,
  });

  function onUpdate(patch: ChecklistPatch) {
    setState((current: EditorState) => ({
      mode: patch.checklistMode ?? current.mode,
      checklist: patch.checklist ?? current.checklist,
      checklistTemplateId: patch.checklistTemplateId !== undefined ? patch.checklistTemplateId : current.checklistTemplateId,
    }));
  }

  return (
    <div>
      <ChecklistEditor mode={state.mode} checklist={state.checklist} checklistTemplateId={state.checklistTemplateId} onUpdate={onUpdate} />
      <div data-testid="debug-state">{JSON.stringify(state)}</div>
    </div>
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("ChecklistEditor", () => {
  it("defaults to the None mode with an empty-state message", () => {
    render(<Harness />);

    expect(screen.getByText("No checklist for this Quest")).toBeInTheDocument();
  });

  it("lets the checklist mode be configured via the None / Fixed / Modifiable buttons", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Fixed" }));
    expect(JSON.parse(screen.getByTestId("debug-state").textContent!).mode).toBe("fixed");

    await user.click(screen.getByRole("button", { name: "Modifiable" }));
    expect(JSON.parse(screen.getByTestId("debug-state").textContent!).mode).toBe("modifiable");

    await user.click(screen.getByRole("button", { name: "None" }));
    expect(JSON.parse(screen.getByTestId("debug-state").textContent!).mode).toBe("none");
  });

  it("creates a Modifiable checklist with items in both tiers", async () => {
    const user = userEvent.setup();
    render(<Harness />);

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

    const state = JSON.parse(screen.getByTestId("debug-state").textContent!);
    expect(state.checklist).toHaveLength(5);
    expect(state.checklist.filter((item: ChecklistItem) => item.tier === "minimum")).toHaveLength(2);
    expect(state.checklist.filter((item: ChecklistItem) => item.tier === "full")).toHaveLength(3);

    expect(screen.getByText("Analyze experiment results")).toBeInTheDocument();
    expect(screen.getByText("Proofread")).toBeInTheDocument();

    const minimumHeader = screen.getByText("Minimum Success").closest("div")!;
    expect(within(minimumHeader).getByText("0 / 2")).toBeInTheDocument();
    // Full Completion counts ALL items (both tiers combined), not just
    // full-tier ones - see checklist-engine.ts's fullTotal = items.length.
    const fullHeader = screen.getByText("Full Completion").closest("div")!;
    expect(within(fullHeader).getByText("0 / 5")).toBeInTheDocument();
  });

  it("creates a Fixed checklist and can save it as a reusable template", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Fixed" }));

    const minimumInput = screen.getByPlaceholderText("Add a Minimum Success item");
    await user.type(minimumInput, "Warm up");
    await user.keyboard("{Enter}");

    const templateNameInput = screen.getByPlaceholderText("New template name");
    await user.type(templateNameInput, "Workout Warmup");
    await user.click(screen.getByRole("button", { name: "Save as Template" }));

    const state = JSON.parse(screen.getByTestId("debug-state").textContent!);
    expect(state.mode).toBe("fixed");
    expect(state.checklistTemplateId).toBeTruthy();

    const stored = JSON.parse(window.localStorage.getItem("menace-checklist-templates") ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe("Workout Warmup");
    expect(stored[0].items).toHaveLength(1);
  });

  it("toggling item completion updates minimum/full progress accurately", async () => {
    const user = userEvent.setup();
    render(<Harness initialMode="modifiable" />);

    const minimumInput = screen.getByPlaceholderText("Add a Minimum Success item");
    await user.type(minimumInput, "Task A");
    await user.keyboard("{Enter}");

    const row = screen.getByText("Task A").closest("div")!;
    const checkbox = within(row).getByRole("button", { name: "Mark complete" });
    await user.click(checkbox);

    const state = JSON.parse(screen.getByTestId("debug-state").textContent!);
    expect(state.checklist[0].completed).toBe(true);

    const minimumHeader = screen.getByText("Minimum Success").closest("div")!;
    expect(within(minimumHeader).getByText("1 / 1")).toBeInTheDocument();
  });

  it("moving an item between tiers via the tier button updates its tier", async () => {
    const user = userEvent.setup();
    render(<Harness initialMode="modifiable" />);

    const minimumInput = screen.getByPlaceholderText("Add a Minimum Success item");
    await user.type(minimumInput, "Movable item");
    await user.keyboard("{Enter}");

    await user.click(screen.getByTitle("Move to Full Completion"));

    const state = JSON.parse(screen.getByTestId("debug-state").textContent!);
    expect(state.checklist).toHaveLength(1);
    expect(state.checklist[0].tier).toBe("full");
  });

  it("switching mode does not delete existing checklist items (no destructive default)", async () => {
    const user = userEvent.setup();
    render(<Harness initialMode="modifiable" />);

    const minimumInput = screen.getByPlaceholderText("Add a Minimum Success item");
    await user.type(minimumInput, "Persistent item");
    await user.keyboard("{Enter}");

    await user.click(screen.getByRole("button", { name: "None" }));
    let state = JSON.parse(screen.getByTestId("debug-state").textContent!);
    expect(state.mode).toBe("none");
    expect(state.checklist).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Modifiable" }));
    state = JSON.parse(screen.getByTestId("debug-state").textContent!);
    expect(state.checklist).toHaveLength(1);
    expect(state.checklist[0].title).toBe("Persistent item");
  });
});
