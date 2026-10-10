"use client";

import { useMemo, useRef, useState } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Card from "../../Card";
import PeriodColumn from "./PeriodColumn";
import CreateAnnualGoalModal from "../hierarchy/CreateAnnualGoalModal";
import CreateQuarterlyGoalModal from "../../planning/CreateQuarterlyGoalModal";
import CreateMonthlyMilestoneModal from "../../planning/CreateMonthlyMilestoneModal";
import CreateWeeklyMilestoneModal from "../../planning/CreateWeeklyMilestoneModal";
import QuestForm, { type QuestFormModel } from "../../quests/QuestForm";
import { createQuestFormModel, upsertQuestFromForm } from "../../quests/quest-form.utils";
import { useGoalTree } from "../../../_lib/hooks/useGoalTree";
import { useProgression } from "../../../_lib/hooks/useProgression";
import { calculateGoalTree } from "../../../_lib/goal-tree-progress";
import { parseLocalDayKey } from "../../../_lib/local-day";
import { getQuestsForDate } from "../../../_lib/engines/quest-calendar-engine";
import { getQuarterRange } from "../../../_lib/engines/planning-engine";
import { getCurrentYear, getUndatedDreams, getYearsWithGoals, yearPeriodKeys } from "../../../_lib/engines/year-planning";
import { BOARD_SCOPES, buildBoardColumns, findParentCandidates, planNodeMove, planQuestMove, selectNodesForColumn, type BoardColumn, type BoardScope } from "../../../_lib/engines/period-board";
import { useLocalStorageState } from "../../../_lib/hooks/use-local-storage-state";
import { BOARD_COLUMN_WIDTHS_KEY } from "../../../_lib/storage-keys";
import type { GoalNode, KeyResult } from "../../../_lib/types/goal-tree";

type PeriodBoardViewProps = Readonly<{
  onEditNode?: (nodeId: string) => void;
  // The page's Hierarchy/Board/Outline switch. The board takes over the
  // whole page, so it hosts the switch rather than leaving an otherwise
  // empty page header above it just to hold three buttons.
  viewSwitcher?: React.ReactNode;
}>;

const ghostClass = "atlas-muted rounded-lg border border-white/10 px-3 py-1.5 text-xs transition hover:text-white";

const pagerArrowClass = "atlas-muted rounded-lg p-1.5 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:bg-transparent";

// How many periods are on screen at once. The board pages a whole
// screenful at a time rather than scrolling, so this is also the step.
const COLUMNS_PER_PAGE = 4;

// The board is a view from now, so width follows how close a period is.
//
// In a single-horizon scope that is literal distance: the current period
// dominates, the next two step down, and the one just gone is the
// narrowest of the four. A page with no "now" on it - another year, or
// pages either side - falls through to the base width and sits even,
// which is honest: nothing on it is closer to now than anything else.
const WEIGHT_BY_DISTANCE: ReadonlyMap<number, number> = new Map([
  [-1, 0.85],
  [0, 1.5],
  [1, 1.1],
  [2, 0.95],
]);

// The overview has no distance to measure - every one of its columns
// contains today - so it ramps by horizon instead: today, then the week
// around it, out to the year.
const OVERVIEW_WEIGHTS: ReadonlyArray<number> = [1.4, 1.15, 1, 0.9, 0.8];

// Everything outside that reach sits at the narrowest width, so a period
// further from now can never be wider than a nearer one - which is what
// happens if the fallback sits above the minimum (Q1 and Q2 outgrowing
// the quarter that only just ended).
const BASE_WEIGHT = 0.85;

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

// The Goal Tree as columns of time.
//
// A second READING of the same tree - every column is calendar maths over
// the existing periodStart fields, and every "+" opens the creation modal
// that already exists for that level. No new storage, no second goal model,
// and the hierarchy view and outline are untouched.
export default function PeriodBoardView({ onEditNode, viewSwitcher }: PeriodBoardViewProps = {}) {
  const { goalTree, hasLoaded, createRootNode, createChildNode, saveNode, moveNode, findNode } = useGoalTree();
  const { isReady, questDefinitions, questCompletions, setQuestDefinitions } = useProgression();

  const [scope, setScope] = useState<BoardScope>("current");
  const [year, setYear] = useState(() => getCurrentYear());
  const [pendingColumn, setPendingColumn] = useState<BoardColumn | null>(null);
  const [pendingParentId, setPendingParentId] = useState<string | null>(null);
  const [questForm, setQuestForm] = useState<QuestFormModel | null>(null);

  const today = useMemo(() => new Date(), []);
  const viewTree = useMemo(() => calculateGoalTree(goalTree), [goalTree]);
  const columns = useMemo(() => buildBoardColumns(scope, year, today), [scope, year, today]);
  const years = useMemo(() => [...new Set([...getYearsWithGoals(viewTree), year])].sort((a, b) => a - b), [viewTree, year]);
  const undatedDreams = useMemo(() => getUndatedDreams(viewTree), [viewTree]);

  // A few pixels of travel before a drag starts, so a row still responds
  // to a plain click by opening its editor.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Where the visible window starts. Null means "wherever today is",
  // which is what every scope change resets to; paging pins it to an
  // absolute index so the clamp at either end sticks exactly.
  const [windowStart, setWindowStart] = useState<number | null>(null);

  // The overview is one page of horizons, never paged. Every other scope
  // shows a window of four periods.
  const isOverview = scope === "current";
  const slots = Math.max(1, isOverview ? columns.length : Math.min(COLUMNS_PER_PAGE, columns.length));
  const maxStart = Math.max(0, columns.length - slots);

  const currentIndex = columns.findIndex((column) => column.isCurrent);
  // The home window puts the current period second, so the one just gone
  // stays beside it rather than falling off the left edge.
  const homeStart = clamp(currentIndex >= 0 ? currentIndex - 1 : 0, 0, maxStart);
  const start = clamp(windowStart ?? homeStart, 0, maxStart);
  const visibleColumns = columns.slice(start, start + slots);

  const canPrevious = start > 0;
  const canNext = start + slots < columns.length;

  function shiftWindow(direction: 1 | -1) {
    setWindowStart(clamp(start + direction * slots, 0, maxStart));
  }

  const weightOf = (index: number) =>
    isOverview ? OVERVIEW_WEIGHTS[index] ?? BASE_WEIGHT : currentIndex < 0 ? BASE_WEIGHT : WEIGHT_BY_DISTANCE.get(index - currentIndex) ?? BASE_WEIGHT;

  // Widths dragged by hand, per scope and per slot, replacing the computed
  // ramp once the user has an opinion. Stored per scope because each has
  // its own column count and its own sensible shape.
  const [widthOverrides, setWidthOverrides] = useLocalStorageState<Partial<Record<BoardScope, number[]>>>(BOARD_COLUMN_WIDTHS_KEY, {});
  const boardRef = useRef<HTMLDivElement | null>(null);

  const scopeOverride = widthOverrides[scope];
  const weights = scopeOverride?.length === visibleColumns.length ? scopeOverride : visibleColumns.map((_, offset) => weightOf(start + offset));

  // Widths as fr units in the grid template. minmax(0, …) rather than a
  // bare fr so a long objective title cannot set a floor and push the
  // board wider than the page.
  const columnTemplate = weights.map((weight) => `minmax(0,${weight}fr)`).join(" ");

  // Dragging the hairline between two columns trades width between those
  // two only, so the board still fills the page exactly and the columns
  // either side stay put. Pixels are converted back to fr on the way out.
  function startResize(dividerIndex: number, event: React.PointerEvent<HTMLElement>) {
    const board = boardRef.current;

    if (!board) {
      return;
    }

    event.preventDefault();
    const cells = [...board.children].filter((child) => child instanceof HTMLElement) as HTMLElement[];
    const pixelWidths = cells.map((cell) => cell.getBoundingClientRect().width);
    const total = pixelWidths.reduce((sum, width) => sum + width, 0);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const startX = event.clientX;
    const leftStart = pixelWidths[dividerIndex];
    const rightStart = pixelWidths[dividerIndex + 1];
    const pairWidth = leftStart + rightStart;
    // Enough for a heading and a checkbox row; below this a column is not
    // a column any more.
    const minimum = Math.min(140, pairWidth / 2);

    const apply = (clientX: number) => {
      const left = Math.min(pairWidth - minimum, Math.max(minimum, leftStart + (clientX - startX)));
      const next = pixelWidths.map((width, index) => (index === dividerIndex ? left : index === dividerIndex + 1 ? pairWidth - left : width));

      setWidthOverrides((current) => ({ ...current, [scope]: next.map((width) => Number(((width / total) * totalWeight).toFixed(4))) }));
    };

    const onMove = (move: PointerEvent) => apply(move.clientX);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function resetWidths() {
    setWidthOverrides((current) => {
      const next = { ...current };
      delete next[scope];
      return next;
    });
  }

  // A drop only ever retimes - the engine refuses anything that would
  // convert one kind of objective into another, so an impossible drag
  // simply lands nowhere rather than rewriting the item.
  function handleDragEnd(event: DragEndEvent) {
    const overId = String(event.over?.id ?? "");
    const activeId = String(event.active?.id ?? "");

    if (!overId.startsWith("column:")) {
      return;
    }

    const column = columns.find((entry) => `column:${entry.id}` === overId);

    if (!column) {
      return;
    }

    if (activeId.startsWith("quest:")) {
      const questId = activeId.slice("quest:".length);
      const quest = questDefinitions.find((entry) => entry.id === questId);
      const plan = quest ? planQuestMove(quest, column) : { ok: false as const, reason: "Quest not found." };

      if (plan.ok) {
        setQuestDefinitions(questDefinitions.map((entry) => (entry.id === questId ? { ...entry, scheduledDate: plan.scheduledDate, updatedAt: new Date().toISOString() } : entry)));
      }

      return;
    }

    if (activeId.startsWith("node:")) {
      const nodeId = activeId.slice("node:".length);
      const node = findNode(nodeId);
      const plan = node ? planNodeMove(viewTree, node, column) : { ok: false as const, reason: "Goal not found." };

      if (plan.ok) {
        moveNode(nodeId, { periodStart: plan.periodStart, periodEnd: plan.periodEnd, parentId: plan.parentId });
      }
    }
  }

  if (!hasLoaded || !isReady) {
    return (
      <Card className="p-5">
        <p className="atlas-muted text-sm">Loading Goal Tree...</p>
      </Card>
    );
  }

  // Why a column cannot accept a new objective yet. The hierarchy is strict
  // - a week lives under a month, a month under a quarter, a quarter under
  // a year - so rather than a dead "+", the column explains which parent is
  // missing.
  function blockedReason(column: BoardColumn): string | null {
    if (column.periodType === "year" || column.periodType === "day") return null;

    if (findParentCandidates(viewTree, column).length === 0) {
      const needed = column.periodType === "quarter" ? "an annual goal" : column.periodType === "month" ? "a quarterly goal" : "a monthly goal";
      return `Create ${needed} covering this period first — every objective hangs off the level above it.`;
    }

    return null;
  }

  function openAdd(column: BoardColumn) {
    if (column.periodType === "day") {
      setQuestForm(createQuestFormModel({ scheduledDate: column.startKey }));
      return;
    }

    const candidates = findParentCandidates(viewTree, column);

    if (column.periodType !== "year" && candidates.length === 0) {
      return;
    }

    setPendingColumn(column);
    // One obvious parent is chosen silently; several means the modal asks.
    setPendingParentId(candidates.length === 1 ? candidates[0].id : null);
  }

  function closeAdd() {
    setPendingColumn(null);
    setPendingParentId(null);
  }

  function handleCreateAnnualGoal(params: { title: string; description: string }) {
    if (!pendingColumn) return;
    createRootNode({
      title: params.title,
      description: params.description,
      type: "dream",
      status: "not_started",
      periodType: "year",
      ...yearPeriodKeys(parseLocalDayKey(pendingColumn.startKey).getFullYear()),
    });
    closeAdd();
  }

  function handleAdoptDream(dreamId: string) {
    if (!pendingColumn) return;
    saveNode(dreamId, (current) => ({
      ...current,
      periodType: "year",
      ...yearPeriodKeys(parseLocalDayKey(pendingColumn.startKey).getFullYear()),
      updatedAt: new Date().toISOString(),
    }));
    closeAdd();
  }

  function handleCreateQuarterlyGoal(params: { dreamId?: string; newDreamTitle?: string; title: string; description: string; keyResults: ReadonlyArray<KeyResult> }) {
    const parentId = params.dreamId ?? pendingParentId;
    if (!pendingColumn || !parentId) return;

    createChildNode(parentId, {
      title: params.title,
      description: params.description,
      type: "long_term_goal",
      parentId,
      status: "not_started",
      periodType: "quarter",
      periodStart: pendingColumn.startKey,
      periodEnd: pendingColumn.endKey,
      keyResults: params.keyResults.length > 0 ? [...params.keyResults] : undefined,
    });
    closeAdd();
  }

  function handleCreateMonthlyGoal(params: { title: string; description: string; month: { start: Date; end: Date } }) {
    if (!pendingColumn || !pendingParentId) return;

    createChildNode(pendingParentId, {
      title: params.title,
      description: params.description,
      type: "milestone",
      parentId: pendingParentId,
      status: "not_started",
      periodType: "month",
      // The column's own range, not the modal's picker - on this board the
      // column IS the month the user clicked.
      periodStart: pendingColumn.startKey,
      periodEnd: pendingColumn.endKey,
    });
    closeAdd();
  }

  function handleCreateWeeklyGoal(params: { title: string; description: string; targetValue: number; unit: string; periodStart: string; periodEnd: string }) {
    if (!pendingColumn || !pendingParentId) return;

    createChildNode(pendingParentId, {
      title: params.title,
      description: params.description,
      type: "progress_goal",
      parentId: pendingParentId,
      status: "not_started",
      periodType: "week",
      periodStart: pendingColumn.startKey,
      periodEnd: pendingColumn.endKey,
      currentValue: 0,
      targetValue: params.targetValue,
      unit: params.unit || undefined,
    });
    closeAdd();
  }

  function saveQuestForm() {
    if (!questForm || !questForm.title.trim()) return;
    setQuestDefinitions(upsertQuestFromForm(questDefinitions, questForm));
    setQuestForm(null);
  }

  const parentCandidates = pendingColumn ? findParentCandidates(viewTree, pendingColumn) : [];
  const pendingQuarterRange = pendingColumn?.periodType === "quarter" ? parseLocalDayKey(pendingColumn.startKey) : null;

  return (
    // Full-bleed from md up: the board escapes the page's centred
    // max-width column so the columns run the whole width of the window,
    // the way a planning board is actually read. Its height is the
    // viewport minus the chrome outside this page - the system bar and
    // main's own padding - so the columns end exactly above the Dock.
    //
    // Both are deliberately md-only. 100vw counts the scrollbar while the
    // content box does not, so breaking out of a page that scrolls
    // vertically buys a horizontal scrollbar; at md and up this board is
    // exactly viewport-high and nothing scrolls vertically, so the two
    // agree. Below md the page scrolls normally, the breakout would gain
    // only main's 16px of padding, and the columns size to their contents.
    <div className="relative flex flex-col gap-3 md:left-1/2 md:h-[calc(100vh-12.25rem)] md:w-screen md:-translate-x-1/2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 md:px-6">
        <h1 className="atlas-display shrink-0 text-2xl font-bold tracking-tight text-white">Goal Tree</h1>

          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 p-1" role="tablist" aria-label="Board scope">
            {BOARD_SCOPES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={scope === entry.id}
                onClick={() => { setScope(entry.id); setWindowStart(null); }}
                className={"rounded-lg px-3 py-1.5 text-xs font-semibold transition " + (scope === entry.id ? "atlas-accent bg-[rgb(var(--atlas-accent,168_85_247)/0.14)]" : "atlas-muted hover:text-white")}
              >
                {entry.label}
              </button>
            ))}
          </div>

          {/* The year selector is meaningless on "current", which is always
              anchored to today. */}
          {scope !== "current" ? (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => { setYear((current) => current - 1); setWindowStart(null); }} className={ghostClass} aria-label="Previous year">
                −
              </button>
              {years.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => { setYear(option); setWindowStart(null); }}
                  className={"rounded-lg border px-3 py-1.5 text-sm font-semibold transition " + (option === year ? "border-amber-300/40 bg-amber-300/10 text-amber-100" : "atlas-muted border-white/10 hover:text-white")}
                >
                  {option}
                </button>
              ))}
              <button type="button" onClick={() => { setYear((current) => current + 1); setWindowStart(null); }} className={ghostClass} aria-label="Next year">
                +
              </button>
            </div>
        ) : null}

        {viewSwitcher ? <div className="ml-auto shrink-0">{viewSwitcher}</div> : null}
      </div>

      {/* Columns take every pixel the title bar leaves, so a period with
          many objectives shows them instead of becoming a stub. min-h-0 is
          what lets this shrink inside the flex column - without it the
          columns' own content would push the board past the Dock. On a
          narrow screen the parent has no fixed height, so the columns fall
          back to sizing from their contents and the page scrolls. */}
      {/* A page of periods, not a strip that scrolls: only this page's
          columns are rendered, and the pager swaps them. Four even slots
          from md up, driven by a custom property because the count drops
          for a scope with fewer periods than a page; stacked below md,
          where four columns side by side would be unreadable. */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={boardRef}
            style={{ "--board-columns": columnTemplate } as React.CSSProperties}
            // grid-rows-1 is minmax(0,1fr), which pins the row to the board's
            // own height instead of letting a packed column grow the row and
            // spill past the Dock. It is what gives the columns a definite
            // height to scroll their lists inside.
            className="grid min-h-[22rem] flex-1 grid-cols-1 border-t border-white/[0.06] md:min-h-0 md:grid-rows-1 md:[grid-template-columns:var(--board-columns)]"
            data-testid="period-board"
            data-window-start={start}
            data-total-columns={columns.length}
          >
            {visibleColumns.map((column) => (
              <PeriodColumn
                key={column.id}
                column={column}
                nodes={selectNodesForColumn(viewTree, column)}
                quests={column.periodType === "day" ? getQuestsForDate(questDefinitions, questCompletions, parseLocalDayKey(column.startKey), today) : []}
                addBlockedReason={blockedReason(column)}
                onAdd={() => openAdd(column)}
                onSelectNode={(node: GoalNode) => onEditNode?.(node.id)}
              />
            ))}
          </div>

          {/* One grab strip per boundary, laid over the hairline. They sit
              outside the grid so they cannot become grid items, and a
              double-click hands the scope back to the computed ramp. */}
          {weights.slice(0, -1).map((_, index) => (
            <div
              key={visibleColumns[index].id}
              role="separator"
              aria-orientation="vertical"
              aria-label={`Resize ${visibleColumns[index].title}`}
              data-testid={`board-resize-${index}`}
              onPointerDown={(event) => startResize(index, event)}
              onDoubleClick={resetWidths}
              title="Drag to resize, double-click to reset"
              className="group absolute top-0 hidden h-full w-3 -translate-x-1/2 cursor-col-resize touch-none md:block"
              style={{ left: `${(weights.slice(0, index + 1).reduce((sum, weight) => sum + weight, 0) / weights.reduce((sum, weight) => sum + weight, 0)) * 100}%` }}
            >
              <div className="mx-auto h-full w-px transition group-hover:bg-[rgb(var(--atlas-accent,168_85_247)/0.7)]" />
            </div>
          ))}
        </div>
      </DndContext>

      {/* Paging through the horizons, with a way straight back to the page
          holding today. Hidden when the whole board is one page. */}
      {canPrevious || canNext ? (
        // Below md the columns stack into a tall page, so the pager floats
        // above it rather than sitting at the bottom of the stack where it
        // could only be reached by scrolling past every column. The Dock is
        // hidden at that width, so nothing collides.
        <div className="fixed bottom-4 right-4 z-20 flex items-center gap-1 rounded-xl border border-white/10 bg-black/70 p-1 shadow-lg backdrop-blur-md md:absolute md:z-10">
          <button type="button" onClick={() => shiftWindow(-1)} disabled={!canPrevious} aria-label="Previous page of periods" className={pagerArrowClass}>
            <ChevronLeft aria-hidden className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setWindowStart(null)}
            className="atlas-muted rounded-lg px-2.5 py-1 text-xs font-semibold transition hover:bg-white/[0.06] hover:text-white"
          >
            Today
          </button>

          <button type="button" onClick={() => shiftWindow(1)} disabled={!canNext} aria-label="Next page of periods" className={pagerArrowClass}>
            <ChevronRight aria-hidden className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {pendingColumn?.periodType === "year" ? (
        <CreateAnnualGoalModal
          year={parseLocalDayKey(pendingColumn.startKey).getFullYear()}
          undatedDreams={undatedDreams}
          onCreate={handleCreateAnnualGoal}
          onAdoptDream={handleAdoptDream}
          onClose={closeAdd}
        />
      ) : null}

      {pendingColumn?.periodType === "quarter" && pendingQuarterRange ? (
        <CreateQuarterlyGoalModal
          quarter={getQuarterRange({ year: pendingQuarterRange.getFullYear(), quarterIndex: (Math.floor(pendingQuarterRange.getMonth() / 3) + 1) as 1 | 2 | 3 | 4 })}
          dreams={parentCandidates}
          onCreate={handleCreateQuarterlyGoal}
          onClose={closeAdd}
        />
      ) : null}

      {pendingColumn?.periodType === "month" && pendingParentId ? (
        <CreateMonthlyMilestoneModal
          months={[
            {
              year: parseLocalDayKey(pendingColumn.startKey).getFullYear(),
              month: parseLocalDayKey(pendingColumn.startKey).getMonth(),
              label: pendingColumn.title,
              start: parseLocalDayKey(pendingColumn.startKey),
              end: parseLocalDayKey(pendingColumn.endKey),
            },
          ]}
          onCreate={handleCreateMonthlyGoal}
          onClose={closeAdd}
        />
      ) : null}

      {pendingColumn?.periodType === "week" && pendingParentId ? (
        <CreateWeeklyMilestoneModal defaultStart={pendingColumn.startKey} onCreate={handleCreateWeeklyGoal} onClose={closeAdd} />
      ) : null}

      {/* Several possible parents and none chosen - ask rather than guess. */}
      {pendingColumn && pendingColumn.periodType !== "year" && pendingColumn.periodType !== "quarter" && !pendingParentId && parentCandidates.length > 1 ? (
        <Card className="p-4">
          <p className="atlas-muted text-xs">More than one parent covers {pendingColumn.title}. Choose which one this objective belongs to:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {parentCandidates.map((candidate) => (
              <button key={candidate.id} type="button" onClick={() => setPendingParentId(candidate.id)} className={ghostClass}>
                {candidate.title}
              </button>
            ))}
            <button type="button" onClick={closeAdd} className={ghostClass}>
              Cancel
            </button>
          </div>
        </Card>
      ) : null}

      {questForm ? <QuestForm form={questForm} isEditing={false} onChange={setQuestForm} onCancel={() => setQuestForm(null)} onSave={saveQuestForm} /> : null}
    </div>
  );
}
