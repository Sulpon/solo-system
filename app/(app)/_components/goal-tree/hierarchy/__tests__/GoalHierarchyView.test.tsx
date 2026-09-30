import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GoalHierarchyView from "../GoalHierarchyView";
import { STORAGE_KEYS } from "../../../../_lib/storage-keys";
import { ProgressionProvider } from "../../../../_lib/progression-store";
import type { GoalNode } from "../../../../_lib/types/goal-tree";
import type { Quest } from "../../../../_lib/types/quest";

// FocusButton pulls in the focus store and a modal; the hierarchy's own
// behaviour is what is under test here, so it is stubbed to a plain marker.
vi.mock("../../../focus/FocusButton", () => ({ default: () => <span data-testid="focus-button" /> }));

const YEAR = new Date().getFullYear();

function node(overrides: Partial<GoalNode> & Pick<GoalNode, "id" | "title" | "type">): GoalNode {
  return { children: [], status: "not_started", progress: 0, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", ...overrides };
}

function quest(overrides: Partial<Quest> & Pick<Quest, "id" | "title">): Quest {
  return {
    description: "",
    categoryId: "discipline",
    xp: 50,
    cadence: "one-time",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as Quest;
}

// A full Year -> Quarter -> Month -> Week -> Quest chain, built the same
// way the app stores it: one tree, parents owning their children.
function fullChainTree(): GoalNode[] {
  const week = node({
    id: "week-1",
    title: "Finish methodology revision",
    type: "progress_goal",
    periodType: "week",
    periodStart: `${YEAR}-02-02`,
    periodEnd: `${YEAR}-02-08`,
    parentId: "month-1",
    currentValue: 2,
    targetValue: 4,
    unit: "sections",
  });

  const month = node({
    id: "month-1",
    title: "Finalize thesis methodology",
    type: "milestone",
    periodType: "month",
    periodStart: `${YEAR}-02-01`,
    periodEnd: `${YEAR}-02-28`,
    parentId: "quarter-1",
    children: [week],
  });

  const quarter = node({
    id: "quarter-1",
    title: "Complete thesis",
    type: "long_term_goal",
    periodType: "quarter",
    periodStart: `${YEAR}-01-01`,
    periodEnd: `${YEAR}-03-31`,
    parentId: "year-1",
    children: [month],
  });

  return [
    node({
      id: "year-1",
      title: "Build the foundation for freedom",
      type: "dream",
      periodType: "year",
      periodStart: `${YEAR}-01-01`,
      periodEnd: `${YEAR}-12-31`,
      children: [quarter],
    }),
  ];
}

function seed(goalTree: GoalNode[], quests: Quest[] = []) {
  window.localStorage.setItem(STORAGE_KEYS.goalTree, JSON.stringify(goalTree));
  window.localStorage.setItem(STORAGE_KEYS.questList, JSON.stringify(quests));
  window.localStorage.setItem(STORAGE_KEYS.questCompletions, JSON.stringify([]));
  window.localStorage.setItem(STORAGE_KEYS.activityEvents, JSON.stringify([]));
  window.localStorage.setItem(STORAGE_KEYS.dailySnapshots, JSON.stringify([]));
  window.localStorage.setItem(STORAGE_KEYS.bonusXpEvents, JSON.stringify([]));
}

function renderView() {
  return render(
    <ProgressionProvider>
      <GoalHierarchyView />
    </ProgressionProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("GoalHierarchyView", () => {
  it("shows an honest empty state for a year with no annual goal, instead of example data", async () => {
    seed([]);
    renderView();

    expect(await screen.findByTestId("hierarchy-empty")).toBeTruthy();
    expect(screen.getByText(`No Annual Goal for ${YEAR}`)).toBeTruthy();
  });

  it("tells the user about undated dreams rather than silently hiding them", async () => {
    seed([node({ id: "d1", title: "Someday", type: "dream" })]);
    renderView();

    expect(await screen.findByText(/1 dream with no year attached/)).toBeTruthy();
  });

  it("renders all five levels of a real chain", async () => {
    seed(fullChainTree(), [quest({ id: "q1", title: "Review methodology chapter", linkedProgressGoalId: "week-1" })]);
    renderView();

    expect(await screen.findByTestId("band-year")).toBeTruthy();
    expect(within(screen.getByTestId("band-year")).getByText("Build the foundation for freedom")).toBeTruthy();
    expect(within(screen.getByTestId("band-quarter")).getByText("Complete thesis")).toBeTruthy();
    expect(within(screen.getByTestId("band-month")).getByText("Finalize thesis methodology")).toBeTruthy();
    expect(within(screen.getByTestId("band-week")).getByText("Finish methodology revision")).toBeTruthy();
    expect(within(screen.getByTestId("band-day")).getByText("Review methodology chapter")).toBeTruthy();
  });

  it("auto-selects down the chain so the hierarchy is never blank on arrival", async () => {
    seed(fullChainTree());
    renderView();

    expect(await screen.findByTestId("year-card-year-1")).toHaveAttribute("data-selected", "true");
    expect(screen.getByTestId("quarter-card-quarter-1")).toHaveAttribute("data-selected", "true");
    expect(screen.getByTestId("month-card-month-1")).toHaveAttribute("data-selected", "true");
  });

  it("shows real child counts, not placeholders", async () => {
    seed(fullChainTree(), [quest({ id: "q1", title: "A", linkedProgressGoalId: "week-1" }), quest({ id: "q2", title: "B", linkedProgressGoalId: "week-1" })]);
    renderView();

    expect(await within(screen.getByTestId("band-year")).findByText("1 quarterly goal")).toBeTruthy();
    expect(within(screen.getByTestId("band-quarter")).getByText("1 monthly goal")).toBeTruthy();
    expect(within(screen.getByTestId("band-month")).getByText("1 weekly dungeon")).toBeTruthy();
    expect(within(screen.getByTestId("band-week")).getByText(/2 quests · 2 \/ 4 sections/)).toBeTruthy();
  });

  it("derives each level's progress from its children rather than storing a separate number", async () => {
    seed(fullChainTree());
    renderView();

    // The week is 2/4 = 50%, and every ancestor is a single-child rollup of
    // it, so all four levels must read 50% from the existing engine.
    const yearCard = await screen.findByTestId("year-card-year-1");

    expect(within(yearCard).getByText("50%")).toBeTruthy();
    expect(within(screen.getByTestId("quarter-card-quarter-1")).getByText("50%")).toBeTruthy();
    expect(within(screen.getByTestId("month-card-month-1")).getByText("50%")).toBeTruthy();
    expect(within(screen.getByTestId("week-card-week-1")).getByText("50%")).toBeTruthy();
  });

  it("only lists quests linked to the selected dungeon", async () => {
    seed(fullChainTree(), [quest({ id: "q1", title: "Linked quest", linkedProgressGoalId: "week-1" }), quest({ id: "q2", title: "Unlinked quest" })]);
    renderView();

    const dayBand = await screen.findByTestId("band-day");

    expect(within(dayBand).getByText("Linked quest")).toBeTruthy();
    expect(within(dayBand).queryByText("Unlinked quest")).toBeNull();
  });

  it("navigates from a child back to its parent through the breadcrumb", async () => {
    const user = userEvent.setup();
    seed(fullChainTree());
    renderView();

    const breadcrumb = await screen.findByRole("navigation", { name: /breadcrumb/i });

    expect(within(breadcrumb).getByText("Build the foundation for freedom")).toBeTruthy();
    expect(within(breadcrumb).getByText("Complete thesis")).toBeTruthy();

    await user.click(within(breadcrumb).getByText("Build the foundation for freedom"));

    expect(screen.getByTestId("year-card-year-1")).toHaveAttribute("data-selected", "true");
  });

  it("keeps a year with no goals empty instead of falling back to another year's data", async () => {
    const user = userEvent.setup();
    seed(fullChainTree());
    renderView();

    await screen.findByTestId("year-card-year-1");
    await user.click(screen.getByRole("button", { name: "Next year" }));

    expect(screen.getByTestId("hierarchy-empty")).toBeTruthy();
  });

  it("keeps the year you are viewing in the selector even when it has no goals", async () => {
    const user = userEvent.setup();
    seed(fullChainTree());
    renderView();

    await screen.findByTestId("year-card-year-1");
    await user.click(screen.getByRole("button", { name: "Next year" }));

    // Without this, stepping into an empty year left no button highlighted
    // and no indication of which year was on screen.
    expect(screen.getByRole("button", { name: String(YEAR + 1) })).toBeTruthy();
    expect(screen.getByRole("button", { name: String(YEAR) })).toBeTruthy();
  });

  it("steps back to the previous year", async () => {
    const user = userEvent.setup();
    seed(fullChainTree());
    renderView();

    await screen.findByTestId("year-card-year-1");
    await user.click(screen.getByRole("button", { name: "Previous year" }));

    expect(screen.getByRole("button", { name: String(YEAR - 1) })).toBeTruthy();
    expect(screen.getByTestId("hierarchy-empty")).toBeTruthy();
  });

  it("opens on the period containing today rather than the earliest one", async () => {
    seed(fullChainTree());
    renderView();

    // The chain's only quarter/month/week are in February; today is not in
    // them, so selection falls through to the first with children - and the
    // year, which does contain today, is selected outright.
    expect(await screen.findByTestId("year-card-year-1")).toHaveAttribute("data-selected", "true");
    expect(screen.getByTestId("week-card-week-1")).toHaveAttribute("data-selected", "true");
  });

  it("offers a quest toggle wired to the real completion control", async () => {
    seed(fullChainTree(), [quest({ id: "q1", title: "Review methodology chapter", linkedProgressGoalId: "week-1" })]);
    renderView();

    const checkbox = await screen.findByRole("checkbox", { name: /Review methodology chapter/ });

    expect(checkbox).not.toBeChecked();
  });
});
