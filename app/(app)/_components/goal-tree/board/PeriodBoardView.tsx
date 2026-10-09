"use client";

import { useMemo, useState } from "react";
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
import { BOARD_SCOPES, buildBoardColumns, findParentCandidates, selectNodesForColumn, type BoardColumn, type BoardScope } from "../../../_lib/engines/period-board";
import type { GoalNode, KeyResult } from "../../../_lib/types/goal-tree";

type PeriodBoardViewProps = Readonly<{
  onEditNode?: (nodeId: string) => void;
  // The page's Hierarchy/Board/Outline switch. The board takes over the
  // whole page, so it hosts the switch rather than leaving an otherwise
  // empty page header above it just to hold three buttons.
  viewSwitcher?: React.ReactNode;
}>;

const ghostClass = "atlas-muted rounded-lg border border-white/10 px-3 py-1.5 text-xs transition hover:text-white";

// The Goal Tree as columns of time.
//
// A second READING of the same tree - every column is calendar maths over
// the existing periodStart fields, and every "+" opens the creation modal
// that already exists for that level. No new storage, no second goal model,
// and the hierarchy view and outline are untouched.
export default function PeriodBoardView({ onEditNode, viewSwitcher }: PeriodBoardViewProps = {}) {
  const { goalTree, hasLoaded, createRootNode, createChildNode, saveNode } = useGoalTree();
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
    <div className="flex flex-col gap-3 md:relative md:left-1/2 md:h-[calc(100vh-12.25rem)] md:w-screen md:-translate-x-1/2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 md:px-6">
        <h1 className="atlas-display shrink-0 text-2xl font-bold tracking-tight text-white">Goal Tree</h1>

          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 p-1" role="tablist" aria-label="Board scope">
            {BOARD_SCOPES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={scope === entry.id}
                onClick={() => setScope(entry.id)}
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
              <button type="button" onClick={() => setYear((current) => current - 1)} className={ghostClass} aria-label="Previous year">
                −
              </button>
              {years.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setYear(option)}
                  className={"rounded-lg border px-3 py-1.5 text-sm font-semibold transition " + (option === year ? "border-amber-300/40 bg-amber-300/10 text-amber-100" : "atlas-muted border-white/10 hover:text-white")}
                >
                  {option}
                </button>
              ))}
              <button type="button" onClick={() => setYear((current) => current + 1)} className={ghostClass} aria-label="Next year">
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
      <div
        className="flex min-h-[22rem] flex-1 overflow-x-auto border-t border-white/[0.06] md:min-h-0"
        data-testid="period-board"
      >
        {columns.map((column) => (
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
