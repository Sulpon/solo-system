"use client";

import { useMemo, useState } from "react";
import Card from "../Card";
import QuestForm, { type QuestFormModel } from "../quests/QuestForm";
import { createQuestFormModel, upsertQuestFromForm } from "../quests/quest-form.utils";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { useProgression } from "../../_lib/hooks/useProgression";
import { findGoalNode, generateGoalNodeId } from "../../_lib/goal-tree-storage";
import { getDreamsWithGoalsInQuarter, getMonthsInQuarter, getQuarterForDate, getQuarterRange, shiftQuarter } from "../../_lib/engines/planning-engine";
import { getLocalDayKey } from "../../_lib/local-day";
import type { GoalNode, KeyResult } from "../../_lib/types/goal-tree";
import QuarterSelector from "./QuarterSelector";
import QuarterlyGoalCard from "./QuarterlyGoalCard";
import QuarterlyGoalDetail from "./QuarterlyGoalDetail";
import CreateQuarterlyGoalModal from "./CreateQuarterlyGoalModal";
import CreateMonthlyMilestoneModal from "./CreateMonthlyMilestoneModal";
import CreateWeeklyMilestoneModal from "./CreateWeeklyMilestoneModal";

export default function PlanningPageClient() {
  const { goalTree, hasLoaded, createRootNode, createChildNode, saveNode } = useGoalTree();
  const { isReady: progressionReady, questDefinitions: quests, setQuestDefinitions } = useProgression();

  const [quarterRef, setQuarterRef] = useState(() => getQuarterForDate(new Date()));
  const [selectedQuarterlyGoalId, setSelectedQuarterlyGoalId] = useState<string | null>(null);
  const [showCreateQuarterlyGoal, setShowCreateQuarterlyGoal] = useState(false);
  const [pendingMonthlyMilestoneParent, setPendingMonthlyMilestoneParent] = useState<GoalNode | null>(null);
  const [pendingWeeklyMilestoneParent, setPendingWeeklyMilestoneParent] = useState<GoalNode | null>(null);
  const [questForm, setQuestForm] = useState<QuestFormModel | null>(null);

  const quarter = useMemo(() => getQuarterRange(quarterRef), [quarterRef]);
  const months = useMemo(() => getMonthsInQuarter(quarter), [quarter]);
  const dreamsWithGoals = useMemo(() => getDreamsWithGoalsInQuarter(goalTree, quarter), [goalTree, quarter]);
  const allDreams = useMemo(() => goalTree.filter((node) => node.type === "dream"), [goalTree]);
  const selectedQuarterlyGoal = selectedQuarterlyGoalId ? findGoalNode(goalTree, selectedQuarterlyGoalId) : null;
  const selectedDream = selectedQuarterlyGoal?.parentId ? findGoalNode(goalTree, selectedQuarterlyGoal.parentId) : null;

  if (!hasLoaded || !progressionReady) {
    return (
      <Card className="p-5">
        <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4 text-sm text-slate-400">Loading Planning...</div>
      </Card>
    );
  }

  function handleCreateQuarterlyGoal(params: { dreamId?: string; newDreamTitle?: string; title: string; description: string; keyResults: ReadonlyArray<KeyResult> }) {
    let resolvedDreamId = params.dreamId;

    if (!resolvedDreamId && params.newDreamTitle) {
      resolvedDreamId = generateGoalNodeId();
      createRootNode({ id: resolvedDreamId, title: params.newDreamTitle, description: "", type: "dream", status: "not_started" });
    }

    if (!resolvedDreamId) {
      return;
    }

    createChildNode(resolvedDreamId, {
      title: params.title,
      description: params.description,
      type: "long_term_goal",
      parentId: resolvedDreamId,
      status: "not_started",
      periodType: "quarter",
      periodStart: getLocalDayKey(quarter.start),
      periodEnd: getLocalDayKey(quarter.end),
      keyResults: params.keyResults.length > 0 ? [...params.keyResults] : undefined,
    });

    setShowCreateQuarterlyGoal(false);
  }

  function handleUpdateKeyResults(quarterlyGoalId: string, keyResults: ReadonlyArray<KeyResult>) {
    saveNode(quarterlyGoalId, (current) => ({ ...current, keyResults, updatedAt: new Date().toISOString() }));
  }

  function handleCreateMonthlyMilestone(params: { title: string; description: string; month: { start: Date; end: Date } }) {
    if (!pendingMonthlyMilestoneParent) return;

    createChildNode(pendingMonthlyMilestoneParent.id, {
      title: params.title,
      description: params.description,
      type: "milestone",
      parentId: pendingMonthlyMilestoneParent.id,
      status: "not_started",
      periodType: "month",
      periodStart: getLocalDayKey(params.month.start),
      periodEnd: getLocalDayKey(params.month.end),
    });

    setPendingMonthlyMilestoneParent(null);
  }

  function handleCreateWeeklyMilestone(params: { title: string; description: string; targetValue: number; unit: string; periodStart: string; periodEnd: string }) {
    if (!pendingWeeklyMilestoneParent) return;

    createChildNode(pendingWeeklyMilestoneParent.id, {
      title: params.title,
      description: params.description,
      type: "progress_goal",
      parentId: pendingWeeklyMilestoneParent.id,
      status: "not_started",
      periodType: "week",
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      currentValue: 0,
      targetValue: params.targetValue,
      unit: params.unit || undefined,
    });

    setPendingWeeklyMilestoneParent(null);
  }

  function saveQuestForm() {
    if (!questForm || !questForm.title.trim()) return;
    setQuestDefinitions(upsertQuestFromForm(quests, questForm));
    setQuestForm(null);
  }

  return (
    <div className="space-y-5">
      {selectedQuarterlyGoal ? (
        <QuarterlyGoalDetail
          quarterlyGoal={selectedQuarterlyGoal}
          dream={selectedDream}
          quests={quests}
          onBack={() => setSelectedQuarterlyGoalId(null)}
          onUpdateKeyResults={(keyResults) => handleUpdateKeyResults(selectedQuarterlyGoal.id, keyResults)}
          onAddMonthlyMilestone={() => setPendingMonthlyMilestoneParent(selectedQuarterlyGoal)}
          onAddWeeklyMilestone={(monthly) => setPendingWeeklyMilestoneParent(monthly)}
          onAddQuest={(weekly) => setQuestForm(createQuestFormModel({ linkedProgressGoalId: weekly.id }))}
        />
      ) : (
        <>
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Planning</p>
                <h1 className="mt-1 text-2xl font-black text-white">Design the next chapter</h1>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateQuarterlyGoal(true)}
                className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
              >
                + New Quarterly Goal
              </button>
            </div>

            <div className="mt-5">
              <QuarterSelector
                quarter={quarter}
                onPrevious={() => setQuarterRef((current) => shiftQuarter(current, -1))}
                onNext={() => setQuarterRef((current) => shiftQuarter(current, 1))}
                onToday={() => setQuarterRef(getQuarterForDate(new Date()))}
                isCurrentQuarter={quarterRef.year === getQuarterForDate(new Date()).year && quarterRef.quarterIndex === getQuarterForDate(new Date()).quarterIndex}
              />
            </div>
          </Card>

          {dreamsWithGoals.length === 0 ? (
            <Card className="p-8">
              <div className="text-center">
                <p className="text-sm text-slate-400">No Quarterly Goals for {quarter.label} yet.</p>
                <button
                  type="button"
                  onClick={() => setShowCreateQuarterlyGoal(true)}
                  className="mt-4 rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
                >
                  Create Your First Quarterly Goal
                </button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dreamsWithGoals.flatMap(({ dream, quarterlyGoals }) =>
                quarterlyGoals.map((goal) => <QuarterlyGoalCard key={goal.id} dream={dream} quarterlyGoal={goal} months={months} onSelect={() => setSelectedQuarterlyGoalId(goal.id)} />),
              )}
            </div>
          )}
        </>
      )}

      {showCreateQuarterlyGoal ? <CreateQuarterlyGoalModal quarter={quarter} dreams={allDreams} onCreate={handleCreateQuarterlyGoal} onClose={() => setShowCreateQuarterlyGoal(false)} /> : null}

      {pendingMonthlyMilestoneParent ? (
        <CreateMonthlyMilestoneModal months={months} onCreate={handleCreateMonthlyMilestone} onClose={() => setPendingMonthlyMilestoneParent(null)} />
      ) : null}

      {pendingWeeklyMilestoneParent ? (
        <CreateWeeklyMilestoneModal defaultStart={pendingWeeklyMilestoneParent.periodStart} onCreate={handleCreateWeeklyMilestone} onClose={() => setPendingWeeklyMilestoneParent(null)} />
      ) : null}

      {questForm ? <QuestForm form={questForm} isEditing={false} onChange={setQuestForm} onCancel={() => setQuestForm(null)} onSave={saveQuestForm} /> : null}
    </div>
  );
}
