import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { getChecklistProgress } from "../../../../_lib/engines/checklist-engine";
import type { AtlasContextSnapshot } from "../../../../_lib/atlas-context";
import type { ChecklistItem, Quest } from "../../../../_lib/types/quest";

const mockUseAtlasContext = vi.fn<() => Partial<AtlasContextSnapshot>>();

vi.mock("../../../../_lib/atlas-context", () => ({
  useAtlasContext: () => mockUseAtlasContext(),
}));

// Imported after the mock so the component picks up the mocked hook - a
// standard vitest/RTL pattern for a component that reads global app state
// through a single hook instead of props.
const { default: CurrentQuestWidget } = await import("../CurrentQuestWidget");

function baseQuest(overrides: Partial<Quest> = {}): Quest {
  return {
    id: "quest-1",
    title: "Thesis — Chapter 4",
    categoryId: "discipline",
    xp: 25,
    cadence: "daily",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function contextWithQuest(quest: Quest | null, extra: Partial<AtlasContextSnapshot> = {}): Partial<AtlasContextSnapshot> {
  const checklistProgress = quest && quest.checklistMode && quest.checklistMode !== "none" ? getChecklistProgress(quest.checklist) : null;

  return {
    activeQuest: quest,
    isQuestExecution: Boolean(quest),
    isFocusRunning: true,
    elapsedSeconds: 90,
    checklistProgress,
    ...extra,
  };
}

beforeEach(() => {
  mockUseAtlasContext.mockReset();
});

describe("CurrentQuestWidget", () => {
  it("shows the existing 'no active quest' layout when nothing is running", () => {
    mockUseAtlasContext.mockReturnValue(contextWithQuest(null));

    render(<CurrentQuestWidget />);

    expect(screen.getByText("No active Quest right now.")).toBeInTheDocument();
  });

  it("keeps the existing clean layout with no checklist section when the quest has no checklist", () => {
    const quest = baseQuest({ checklistMode: "none" });
    mockUseAtlasContext.mockReturnValue(contextWithQuest(quest));

    render(<CurrentQuestWidget />);

    expect(screen.getByText("Thesis — Chapter 4")).toBeInTheDocument();
    expect(screen.queryByText(/completed$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Minimum Success/)).not.toBeInTheDocument();
  });

  it("renders individual checklist items when the quest has a checklist", () => {
    const checklist: ChecklistItem[] = [
      { id: "i1", title: "Analyze experiment results", completed: true, tier: "minimum" },
      { id: "i2", title: "Write Section 4.2", completed: true, tier: "minimum" },
      { id: "i3", title: "Write Section 4.3", completed: false, tier: "full" },
      { id: "i4", title: "Review figures", completed: false, tier: "full" },
      { id: "i5", title: "Proofread", completed: false, tier: "full" },
    ];
    const quest = baseQuest({ checklistMode: "modifiable", checklist });
    mockUseAtlasContext.mockReturnValue(contextWithQuest(quest));

    render(<CurrentQuestWidget />);

    for (const item of checklist) {
      expect(screen.getByText(item.title)).toBeInTheDocument();
    }
  });

  it("shows completed items with a filled checkbox and incomplete items with an empty one", () => {
    const checklist: ChecklistItem[] = [
      { id: "i1", title: "Done item", completed: true, tier: "minimum" },
      { id: "i2", title: "Open item", completed: false, tier: "full" },
    ];
    const quest = baseQuest({ checklistMode: "modifiable", checklist });
    mockUseAtlasContext.mockReturnValue(contextWithQuest(quest));

    render(<CurrentQuestWidget />);

    const doneRow = screen.getByText("Done item").closest("div")!;
    expect(doneRow.textContent).toContain("☑");
    const openRow = screen.getByText("Open item").closest("div")!;
    expect(openRow.textContent).toContain("☐");
  });

  it("shows an accurate aggregate 'X / Y completed' line and Minimum Success tier counts", () => {
    const checklist: ChecklistItem[] = [
      { id: "i1", title: "Analyze experiment results", completed: true, tier: "minimum" },
      { id: "i2", title: "Write Section 4.2", completed: true, tier: "minimum" },
      { id: "i3", title: "Write Section 4.3", completed: false, tier: "full" },
      { id: "i4", title: "Review figures", completed: false, tier: "full" },
      { id: "i5", title: "Proofread", completed: false, tier: "full" },
    ];
    const quest = baseQuest({ checklistMode: "modifiable", checklist });
    mockUseAtlasContext.mockReturnValue(contextWithQuest(quest));

    render(<CurrentQuestWidget />);

    expect(screen.getByText("2 / 5 completed")).toBeInTheDocument();
    expect(screen.getByText("Minimum Success: 2/2 ✓")).toBeInTheDocument();
  });

  it("shows Minimum Success progress without a checkmark when not yet reached", () => {
    const checklist: ChecklistItem[] = [
      { id: "i1", title: "Item A", completed: true, tier: "minimum" },
      { id: "i2", title: "Item B", completed: false, tier: "minimum" },
    ];
    const quest = baseQuest({ checklistMode: "modifiable", checklist });
    mockUseAtlasContext.mockReturnValue(contextWithQuest(quest));

    render(<CurrentQuestWidget />);

    expect(screen.getByText("Minimum Success: 1/2")).toBeInTheDocument();
  });

  it("truncates to <=6 visible items and shows a '+N more' indicator for larger checklists", () => {
    const checklist: ChecklistItem[] = [
      { id: "min-1", title: "Minimum open 1", completed: false, tier: "minimum" },
      { id: "min-2", title: "Minimum open 2", completed: false, tier: "minimum" },
      { id: "min-3", title: "Minimum done", completed: true, tier: "minimum" },
      { id: "full-1", title: "Full open 1", completed: false, tier: "full" },
      { id: "full-2", title: "Full open 2", completed: false, tier: "full" },
      { id: "full-3", title: "Full open 3", completed: false, tier: "full" },
      { id: "full-4", title: "Full open 4", completed: false, tier: "full" },
      { id: "full-5", title: "Full done", completed: true, tier: "full" },
    ];
    const quest = baseQuest({ checklistMode: "modifiable", checklist });
    mockUseAtlasContext.mockReturnValue(contextWithQuest(quest));

    render(<CurrentQuestWidget />);

    expect(screen.getByText("Minimum open 1")).toBeInTheDocument();
    expect(screen.getByText("Minimum open 2")).toBeInTheDocument();
    expect(screen.getByText("Minimum done")).toBeInTheDocument();
    // 8 items total, cap is 6 - exactly 2 must be hidden (both incomplete
    // Minimum items are always shown, so the completed Full item and one
    // incomplete Full item are what gets folded into "+2 more").
    expect(screen.getByText("+2 more")).toBeInTheDocument();
    expect(screen.queryByText("Full done")).not.toBeInTheDocument();
  });

  it("reads live Quest state from context - a checklist edit made elsewhere shows up on the next render, no separate widget state", () => {
    const openQuest = baseQuest({
      checklistMode: "modifiable",
      checklist: [{ id: "i1", title: "Not yet done", completed: false, tier: "minimum" }],
    });
    mockUseAtlasContext.mockReturnValue(contextWithQuest(openQuest));

    const { rerender } = render(<CurrentQuestWidget />);
    expect(screen.getByText("Minimum Success: 0/1")).toBeInTheDocument();

    // Simulate the same quest getting completed elsewhere (Quest detail tab,
    // FocusOverlay, Focus Companion) - the widget has no local checklist
    // state of its own, so a fresh context snapshot is all it takes.
    const completedQuest = baseQuest({
      checklistMode: "modifiable",
      checklist: [{ id: "i1", title: "Not yet done", completed: true, tier: "minimum" }],
    });
    mockUseAtlasContext.mockReturnValue(contextWithQuest(completedQuest));
    rerender(<CurrentQuestWidget />);

    expect(screen.getByText("Minimum Success: 1/1 ✓")).toBeInTheDocument();
  });
});
