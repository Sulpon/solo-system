"use client";

import { useMemo, useState } from "react";
import Card from "../../Card";
import ThemeEmptyState from "../../theme/ThemeEmptyState";
import HierarchyBand from "./HierarchyBand";
import HierarchyCard from "./HierarchyCard";
import QuestLine from "./QuestLine";
import CreateAnnualGoalModal from "./CreateAnnualGoalModal";
import YearPanel from "./YearPanel";
import PlanningCrossLink from "../../planning/PlanningCrossLink";
import CreateQuarterlyGoalModal from "../../planning/CreateQuarterlyGoalModal";
import CreateMonthlyMilestoneModal from "../../planning/CreateMonthlyMilestoneModal";
import CreateWeeklyMilestoneModal from "../../planning/CreateWeeklyMilestoneModal";
import QuestForm, { type QuestFormModel } from "../../quests/QuestForm";
import { createQuestFormModel, toQuestForm, upsertQuestFromForm } from "../../quests/quest-form.utils";
import { useGoalTree } from "../../../_lib/hooks/useGoalTree";
import { useProgression } from "../../../_lib/hooks/useProgression";
import { calculateGoalTree } from "../../../_lib/goal-tree-progress";
import { getLocalDayKey, parseLocalDayKey } from "../../../_lib/local-day";
import { formatDateRange, getMonthlyMilestones, getMonthsInQuarter, getQuarterRange, getQuestsForWeeklyMilestone, getWeeklyMilestones } from "../../../_lib/engines/planning-engine";
import { findAnnualGoalsForYear, getCurrentYear, getQuarterlyGoalsForAnnualGoal, getUndatedDreams, getYearsWithGoals, pickCurrentNode, yearPeriodKeys } from "../../../_lib/engines/year-planning";
import { Target } from "lucide-react";
import type { GoalNode, KeyResult } from "../../../_lib/types/goal-tree";

// The hierarchical Goal Tree: YEAR -> QUARTER -> MONTH -> WEEK -> DAY.
//
// Every level reads the SAME GoalNode tree through the existing
// planning-engine traversals, and every mutation goes through the existing
// useGoalTree / useProgression functions and the existing creation modals.
// There is no second goal store, no duplicated quest model, and no progress
// computed here - progress is always the node's own rolled-up value from
// goal-tree-progress.ts.
//
// Selection is the navigation: choosing a node reveals its children in the
// band below. Effective selection is DERIVED rather than synced in an
// effect, so deleting or switching away from a selected node falls back to
// the first available sibling instead of leaving the lower bands blank.

const addButtonClass =
  "rounded-lg border border-[rgb(var(--atlas-accent,168_85_247)/0.45)] bg-[rgb(var(--atlas-accent,168_85_247)/0.12)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[rgb(var(--atlas-accent,168_85_247)/0.22)]";
const ghostButtonClass = "atlas-muted rounded-lg border border-white/10 px-3 py-1.5 text-xs transition hover:text-white";

function periodLabel(node: GoalNode): string | undefined {
  if (!node.periodStart || !node.periodEnd) return undefined;
  return formatDateRange(parseLocalDayKey(node.periodStart), parseLocalDayKey(node.periodEnd));
}

function countLabel(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

type GoalHierarchyViewProps = Readonly<{
  // GoalTreePage owns the existing GoalNodeEditor; passing its opener in
  // means every level edits through that one editor instead of this view
  // growing a second one.
  onEditNode?: (nodeId: string) => void;
}>;

export default function GoalHierarchyView({ onEditNode }: GoalHierarchyViewProps = {}) {
  const { goalTree, hasLoaded, createRootNode, createChildNode, saveNode } = useGoalTree();
  const { isReady, questDefinitions, setQuestDefinitions, setQuestCompletionForToday, hasQuestCompletedToday } = useProgression();

  const [year, setYear] = useState(() => getCurrentYear());
  const [annualId, setAnnualId] = useState<string | null>(null);
  const [quarterId, setQuarterId] = useState<string | null>(null);
  const [monthId, setMonthId] = useState<string | null>(null);
  const [weekId, setWeekId] = useState<string | null>(null);

  const [showCreateAnnual, setShowCreateAnnual] = useState(false);
  const [pendingQuarterIndex, setPendingQuarterIndex] = useState<1 | 2 | 3 | 4 | null>(null);
  const [pendingMonthParent, setPendingMonthParent] = useState<GoalNode | null>(null);
  const [pendingWeekParent, setPendingWeekParent] = useState<GoalNode | null>(null);
  const [questForm, setQuestForm] = useState<QuestFormModel | null>(null);

  // Computed progress for the whole tree, once. Passing this view tree into
  // the planning traversals means every card below shows the real rolled-up
  // percentage without recomputing anything per card.
  const viewTree = useMemo(() => calculateGoalTree(goalTree), [goalTree]);

  const yearsWithGoals = useMemo(() => getYearsWithGoals(viewTree), [viewTree]);
  const years = useMemo(() => [...new Set([...yearsWithGoals, year])].sort((first, second) => first - second), [yearsWithGoals, year]);
  const annualGoals = useMemo(() => findAnnualGoalsForYear(viewTree, year), [viewTree, year]);
  const undatedDreams = useMemo(() => getUndatedDreams(viewTree), [viewTree]);

  const selectedAnnual = annualGoals.find((goal) => goal.id === annualId) ?? pickCurrentNode(annualGoals);

  const quarterlyGoals = useMemo(() => (selectedAnnual ? getQuarterlyGoalsForAnnualGoal(selectedAnnual, year) : []), [selectedAnnual, year]);
  const selectedQuarter = quarterlyGoals.find((goal) => goal.id === quarterId) ?? pickCurrentNode(quarterlyGoals);

  const monthlyGoals = useMemo(() => (selectedQuarter ? getMonthlyMilestones(selectedQuarter) : []), [selectedQuarter]);
  const selectedMonth = monthlyGoals.find((goal) => goal.id === monthId) ?? pickCurrentNode(monthlyGoals);

  const weeklyGoals = useMemo(() => (selectedMonth ? getWeeklyMilestones(selectedMonth) : []), [selectedMonth]);
  const selectedWeek = weeklyGoals.find((goal) => goal.id === weekId) ?? pickCurrentNode(weeklyGoals);

  const weekQuests = useMemo(() => (selectedWeek ? getQuestsForWeeklyMilestone(selectedWeek, questDefinitions) : []), [selectedWeek, questDefinitions]);

  const quarterRanges = useMemo(() => ([1, 2, 3, 4] as const).map((quarterIndex) => getQuarterRange({ year, quarterIndex })), [year]);
  const today = useMemo(() => new Date(), []);
  const monthsOfSelectedQuarter = useMemo(() => {
    if (!selectedQuarter?.periodStart) return [];
    const start = parseLocalDayKey(selectedQuarter.periodStart);
    return getMonthsInQuarter({ year: start.getFullYear(), quarterIndex: (Math.floor(start.getMonth() / 3) + 1) as 1 | 2 | 3 | 4 });
  }, [selectedQuarter]);

  if (!hasLoaded || !isReady) {
    return (
      <Card className="p-5">
        <p className="atlas-muted text-sm">Loading Goal Tree...</p>
      </Card>
    );
  }

  function stepYear(delta: number) {
    setYear((current) => current + delta);
    setAnnualId(null);
    setQuarterId(null);
    setMonthId(null);
    setWeekId(null);
  }

  function selectAnnual(id: string) {
    setAnnualId(id);
    setQuarterId(null);
    setMonthId(null);
    setWeekId(null);
  }

  function selectQuarter(id: string) {
    setQuarterId(id);
    setMonthId(null);
    setWeekId(null);
  }

  function selectMonth(id: string) {
    setMonthId(id);
    setWeekId(null);
  }

  function handleCreateAnnualGoal(params: { title: string; description: string }) {
    const period = yearPeriodKeys(year);
    createRootNode({ title: params.title, description: params.description, type: "dream", status: "not_started", periodType: "year", ...period });
    setShowCreateAnnual(false);
  }

  // Dating an existing Dream rather than copying it: the node keeps its id,
  // its children and its history, so nothing under it moves or is
  // duplicated.
  function handleAdoptDream(dreamId: string) {
    const period = yearPeriodKeys(year);
    saveNode(dreamId, (current) => ({ ...current, periodType: "year", ...period, updatedAt: new Date().toISOString() }));
    setShowCreateAnnual(false);
    selectAnnual(dreamId);
  }

  function handleCreateQuarterlyGoal(params: { title: string; description: string; keyResults: ReadonlyArray<KeyResult> }) {
    if (!selectedAnnual || pendingQuarterIndex === null) return;
    const range = getQuarterRange({ year, quarterIndex: pendingQuarterIndex });

    createChildNode(selectedAnnual.id, {
      title: params.title,
      description: params.description,
      type: "long_term_goal",
      parentId: selectedAnnual.id,
      status: "not_started",
      periodType: "quarter",
      periodStart: getLocalDayKey(range.start),
      periodEnd: getLocalDayKey(range.end),
      keyResults: params.keyResults.length > 0 ? [...params.keyResults] : undefined,
    });

    setPendingQuarterIndex(null);
  }

  function handleCreateMonthlyGoal(params: { title: string; description: string; month: { start: Date; end: Date } }) {
    if (!pendingMonthParent) return;

    createChildNode(pendingMonthParent.id, {
      title: params.title,
      description: params.description,
      type: "milestone",
      parentId: pendingMonthParent.id,
      status: "not_started",
      periodType: "month",
      periodStart: getLocalDayKey(params.month.start),
      periodEnd: getLocalDayKey(params.month.end),
    });

    setPendingMonthParent(null);
  }

  function handleCreateWeeklyGoal(params: { title: string; description: string; targetValue: number; unit: string; periodStart: string; periodEnd: string }) {
    if (!pendingWeekParent) return;

    createChildNode(pendingWeekParent.id, {
      title: params.title,
      description: params.description,
      type: "progress_goal",
      parentId: pendingWeekParent.id,
      status: "not_started",
      periodType: "week",
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      currentValue: 0,
      targetValue: params.targetValue,
      unit: params.unit || undefined,
    });

    setPendingWeekParent(null);
  }

  function saveQuestForm() {
    if (!questForm || !questForm.title.trim()) return;
    setQuestDefinitions(upsertQuestFromForm(questDefinitions, questForm));
    setQuestForm(null);
  }

  return (
    <div className="space-y-4">
      {/* Year selector + breadcrumb. The breadcrumb is the child-to-parent
          navigation: each crumb re-selects that ancestor and clears the
          selections below it. */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="atlas-muted text-[0.62rem] font-semibold uppercase tracking-[0.3em]">Year</span>
            {years.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setYear(option);
                  setAnnualId(null);
                  setQuarterId(null);
                  setMonthId(null);
                  setWeekId(null);
                }}
                className={
                  "rounded-lg border px-3 py-1.5 text-sm font-semibold transition " +
                  (option === year ? "border-amber-300/40 bg-amber-300/10 text-amber-100" : "atlas-muted border-white/10 hover:text-white")
                }
              >
                {option}
              </button>
            ))}
            <button type="button" onClick={() => stepYear(-1)} className={ghostButtonClass} aria-label="Previous year">
              −
            </button>
            <button type="button" onClick={() => stepYear(1)} className={ghostButtonClass} aria-label="Next year">
              +
            </button>
          </div>

          <button type="button" onClick={() => setShowCreateAnnual(true)} className={addButtonClass}>
            + Annual Goal
          </button>
        </div>

        {selectedAnnual ? (
          <nav aria-label="Hierarchy breadcrumb" className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
            <button type="button" onClick={() => selectAnnual(selectedAnnual.id)} className="atlas-muted transition hover:text-white">
              {selectedAnnual.title}
            </button>
            {selectedQuarter ? (
              <>
                <span className="text-white/25">/</span>
                <button type="button" onClick={() => selectQuarter(selectedQuarter.id)} className="atlas-muted transition hover:text-white">
                  {selectedQuarter.title}
                </button>
              </>
            ) : null}
            {selectedMonth ? (
              <>
                <span className="text-white/25">/</span>
                <button type="button" onClick={() => selectMonth(selectedMonth.id)} className="atlas-muted transition hover:text-white">
                  {selectedMonth.title}
                </button>
              </>
            ) : null}
            {selectedWeek ? (
              <>
                <span className="text-white/25">/</span>
                <span className="text-white">{selectedWeek.title}</span>
              </>
            ) : null}
          </nav>
        ) : null}
      </Card>

      {annualGoals.length === 0 ? (
        <ThemeEmptyState
          testId="hierarchy-empty"
          icon={Target}
          title={`No Annual Goal for ${year}`}
          description={
            undatedDreams.length > 0
              ? `You have ${countLabel(undatedDreams.length, "dream")} with no year attached. Create an Annual Goal, or date an existing dream to ${year}, to start the hierarchy.`
              : "Start with the direction for this year. Quarters, months, weeks and daily quests hang beneath it."
          }
          action={
            <button type="button" onClick={() => setShowCreateAnnual(true)} className={addButtonClass}>
              + Annual Goal
            </button>
          }
        />
      ) : (
        <Card className="p-4 md:p-6">
          <HierarchyBand level="year" caption={countLabel(annualGoals.length, "annual goal")} testId="band-year">
            <div className="space-y-3">
              {annualGoals.map((goal) => (
                <YearPanel
                  key={goal.id}
                  annualGoal={goal}
                  meta={`Annual Goal · ${year}`}
                  quarterlyGoalCount={getQuarterlyGoalsForAnnualGoal(goal, year).length}
                  selected={goal.id === selectedAnnual?.id}
                  onSelect={() => selectAnnual(goal.id)}
                  onEdit={() => onEditNode?.(goal.id)}
                />
              ))}
            </div>
          </HierarchyBand>

          <HierarchyBand level="quarter" caption={selectedAnnual ? `Under “${selectedAnnual.title}”` : undefined} testId="band-quarter">
            <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {quarterRanges.map((range) => {
                const goalsInQuarter = quarterlyGoals.filter((goal) => goal.periodStart && parseLocalDayKey(goal.periodStart) >= range.start && parseLocalDayKey(goal.periodStart) <= range.end);

                const isCurrentQuarter = range.start <= today && today <= range.end;

                return (
                  // min-w-0 on every column: without it a grid item's
                  // default min-width:auto lets long titles and date ranges
                  // push the whole row wider than the viewport, which is
                  // what caused horizontal scrolling at phone widths.
                  <div key={range.label} className="min-w-0 space-y-2">
                    {/* Stacked, not justify-between: at 390px the label and
                        a full date range cannot share a line. */}
                    <div className="min-w-0">
                      <p className={"text-[0.62rem] font-semibold uppercase tracking-[0.26em] " + (isCurrentQuarter ? "text-sky-200" : "text-sky-200/60")}>
                        {range.label}
                        {isCurrentQuarter ? <span className="ml-1.5 rounded bg-sky-300/15 px-1 py-0.5 text-[0.55rem] tracking-normal">now</span> : null}
                      </p>
                      <p className="atlas-muted truncate text-[0.6rem]">{formatDateRange(range.start, range.end)}</p>
                    </div>

                    {goalsInQuarter.map((goal) => (
                      <HierarchyCard
                        key={goal.id}
                        testId={`quarter-card-${goal.id}`}
                        level="quarter"
                        title={goal.title}
                        description={goal.description}
                        progress={goal.progress}
                        childSummary={countLabel(getMonthlyMilestones(goal).length, "monthly goal")}
                        keyResults={goal.keyResults}
                        selected={goal.id === selectedQuarter?.id}
                        onSelect={() => selectQuarter(goal.id)}
                        onEdit={onEditNode ? () => onEditNode(goal.id) : undefined}
                      />
                    ))}

                    <button type="button" onClick={() => setPendingQuarterIndex(range.quarterIndex)} className={"w-full " + ghostButtonClass}>
                      + Goal
                    </button>
                  </div>
                );
              })}
            </div>
          </HierarchyBand>

          <HierarchyBand
            level="month"
            muted={!selectedQuarter}
            caption={selectedQuarter ? `Under “${selectedQuarter.title}”` : "Select a quarterly goal above"}
            actions={
              selectedQuarter ? (
                <button type="button" onClick={() => setPendingMonthParent(selectedQuarter)} className={addButtonClass}>
                  + Monthly Goal
                </button>
              ) : null
            }
            testId="band-month"
          >
            {!selectedQuarter ? (
              <p className="atlas-muted text-sm">Nothing to show until a quarterly goal is selected.</p>
            ) : monthlyGoals.length === 0 ? (
              <p className="atlas-muted text-sm">No monthly goals yet. Break this quarter into months to give it a shape.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {monthlyGoals.map((goal) => (
                  <HierarchyCard
                    key={goal.id}
                    testId={`month-card-${goal.id}`}
                    level="month"
                    title={goal.title}
                    meta={periodLabel(goal)}
                    description={goal.description}
                    progress={goal.progress}
                    childSummary={countLabel(getWeeklyMilestones(goal).length, "weekly dungeon")}
                    selected={goal.id === selectedMonth?.id}
                    onSelect={() => selectMonth(goal.id)}
                    onEdit={onEditNode ? () => onEditNode(goal.id) : undefined}
                  />
                ))}
              </div>
            )}
          </HierarchyBand>

          <HierarchyBand
            level="week"
            muted={!selectedMonth}
            caption={selectedMonth ? `Dungeons under “${selectedMonth.title}”` : "Select a monthly goal above"}
            actions={
              selectedMonth ? (
                <button type="button" onClick={() => setPendingWeekParent(selectedMonth)} className={addButtonClass}>
                  + Weekly Dungeon
                </button>
              ) : null
            }
            testId="band-week"
          >
            {!selectedMonth ? (
              <p className="atlas-muted text-sm">Nothing to show until a monthly goal is selected.</p>
            ) : weeklyGoals.length === 0 ? (
              <p className="atlas-muted text-sm">No weekly dungeons yet. A dungeon is one week of execution towards this month.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {weeklyGoals.map((goal) => {
                  const questCount = getQuestsForWeeklyMilestone(goal, questDefinitions).length;

                  return (
                    <HierarchyCard
                      key={goal.id}
                      testId={`week-card-${goal.id}`}
                      level="week"
                      title={goal.title}
                      meta={periodLabel(goal)}
                      description={goal.description}
                      progress={goal.progress}
                      childSummary={`${countLabel(questCount, "quest")} · ${goal.currentValue ?? 0} / ${goal.targetValue ?? 1} ${goal.unit ?? ""}`.trim()}
                      selected={goal.id === selectedWeek?.id}
                      onSelect={() => setWeekId(goal.id)}
                      onEdit={onEditNode ? () => onEditNode(goal.id) : undefined}
                    />
                  );
                })}
              </div>
            )}
          </HierarchyBand>

          <HierarchyBand
            level="day"
            showConnector={false}
            muted={!selectedWeek}
            caption={selectedWeek ? `Quests in “${selectedWeek.title}”` : "Select a weekly dungeon above"}
            actions={
              selectedWeek ? (
                <button type="button" onClick={() => setQuestForm(createQuestFormModel({ linkedProgressGoalId: selectedWeek.id }))} className={addButtonClass}>
                  + Quest
                </button>
              ) : null
            }
            testId="band-day"
          >
            {!selectedWeek ? (
              <p className="atlas-muted text-sm">Nothing to show until a weekly dungeon is selected.</p>
            ) : weekQuests.length === 0 ? (
              <p className="atlas-muted text-sm">No quests linked to this dungeon yet.</p>
            ) : (
              <div className="space-y-2">
                {weekQuests.map((quest) => (
                  <QuestLine
                    key={quest.id}
                    quest={quest}
                    completed={hasQuestCompletedToday(quest.id)}
                    onToggle={() => setQuestCompletionForToday(quest.id, !hasQuestCompletedToday(quest.id))}
                    onEdit={() => setQuestForm(toQuestForm(quest))}
                  />
                ))}
              </div>
            )}
          </HierarchyBand>
        </Card>
      )}

      <PlanningCrossLink from="goal-tree" />

      {showCreateAnnual ? (
        <CreateAnnualGoalModal year={year} undatedDreams={undatedDreams} onCreate={handleCreateAnnualGoal} onAdoptDream={handleAdoptDream} onClose={() => setShowCreateAnnual(false)} />
      ) : null}

      {pendingQuarterIndex !== null && selectedAnnual ? (
        <CreateQuarterlyGoalModal
          quarter={getQuarterRange({ year, quarterIndex: pendingQuarterIndex })}
          // The parent is already decided by which Annual Goal is selected,
          // so the modal's dream picker is pinned to it rather than
          // offering a choice that would contradict the hierarchy.
          dreams={[selectedAnnual]}
          onCreate={handleCreateQuarterlyGoal}
          onClose={() => setPendingQuarterIndex(null)}
        />
      ) : null}

      {/* Guarded on a non-empty month list: CreateMonthlyMilestoneModal
          indexes months[monthIndex] directly, so opening it for a quarterly
          goal with no period (only reachable if one is ever created outside
          the planning flow) would hand the save handler an undefined month. */}
      {pendingMonthParent && monthsOfSelectedQuarter.length > 0 ? (
        <CreateMonthlyMilestoneModal months={monthsOfSelectedQuarter} onCreate={handleCreateMonthlyGoal} onClose={() => setPendingMonthParent(null)} />
      ) : null}

      {pendingWeekParent ? <CreateWeeklyMilestoneModal defaultStart={pendingWeekParent.periodStart} onCreate={handleCreateWeeklyGoal} onClose={() => setPendingWeekParent(null)} /> : null}

      {questForm ? <QuestForm form={questForm} isEditing={Boolean(questForm.id)} onChange={setQuestForm} onCancel={() => setQuestForm(null)} onSave={saveQuestForm} /> : null}
    </div>
  );
}
