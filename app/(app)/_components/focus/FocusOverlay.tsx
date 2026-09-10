"use client";

import { useMemo, useRef } from "react";
import { useFocus, type FocusFinishExtra } from "../../_lib/focus-store";
import { useFocusHistory } from "../../_lib/hooks/useFocusHistory";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { useProgression } from "../../_lib/hooks/useProgression";
import { findGoalNode } from "../../_lib/goal-tree-storage";
import { getTodayFocusMinutes } from "../../_lib/focus-stats";
import { getChecklistProgress } from "../../_lib/engines/checklist-engine";
import { FOCUS_MODE_LABELS } from "../../_lib/types/focus";
import type { ChecklistItem, ChecklistMode } from "../../_lib/types/quest";
import { useQuestCompletionFlow } from "../quests/useQuestCompletionFlow";
import QuestCompletionModal from "../quests/QuestCompletionModal";
import QuestChecklistTab from "../quests/QuestChecklistTab";
import QuestFinishFeedback, { type QuestFeedbackDraft } from "./QuestFinishFeedback";
import FocusTimer from "./FocusTimer";
import { formatFocusMinutesLabel } from "./focus-format";

const buttonClass = "rounded-xl border px-5 py-3 text-sm font-semibold transition";
const primaryButtonClass = buttonClass + " border-purple-400/50 bg-purple-500/15 text-purple-100 hover:bg-purple-500/25";
const quietButtonClass = buttonClass + " border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white";
const dangerButtonClass = buttonClass + " border-rose-500/40 text-rose-200 hover:border-rose-300 hover:text-white";

export default function FocusOverlay() {
  const {
    activeSession,
    remainingSeconds,
    elapsedSeconds,
    isRunning,
    isMinimized,
    showCompletionPrompt,
    canContinueWorking,
    pauseSession,
    resumeSession,
    requestEndSession,
    extendSession,
    finishSession,
    minimize,
  } = useFocus();
  const { history } = useFocusHistory();
  const { goalTree } = useGoalTree();
  const { questDefinitions, setQuestDefinitions } = useProgression();
  const {
    pendingQuest,
    pendingGoal,
    progressValue,
    setProgressValue,
    beginQuestCompletion,
    confirmQuestCompletion,
    cancelQuestCompletion,
  } = useQuestCompletionFlow();
  // Stashes the feedback the user entered in QuestFinishFeedback across the
  // async gap while QuestCompletionModal is open (goal-linked numeric
  // quests) - handleConfirmFromModal below reads and clears it once the
  // completion is actually confirmed, so finishSession's history entry
  // still gets the right extras regardless of which path completion took.
  const pendingFeedbackExtraRef = useRef<FocusFinishExtra | null>(null);

  const isQuestExecution = activeSession?.mode === "quest-execution";

  const linkedQuest = useMemo(
    () => (activeSession?.linkedQuestId ? questDefinitions.find((quest) => quest.id === activeSession.linkedQuestId) ?? null : null),
    [activeSession?.linkedQuestId, questDefinitions],
  );
  const linkedGoalTitle = useMemo(
    () => (activeSession?.linkedGoalId ? findGoalNode(goalTree, activeSession.linkedGoalId)?.title ?? null : null),
    [activeSession?.linkedGoalId, goalTree],
  );
  const linkedDreamTitle = useMemo(
    () => (activeSession?.linkedDreamId ? findGoalNode(goalTree, activeSession.linkedDreamId)?.title ?? null : null),
    [activeSession?.linkedDreamId, goalTree],
  );
  const todayMinutes = useMemo(() => getTodayFocusMinutes(history), [history]);
  // null (not shown) when the linked Quest has no checklist at all - see
  // "Read 20 pages" in the spec: a no-checklist Quest's execution view and
  // feedback form simply omit checklist state entirely, rather than
  // showing an empty/zeroed Minimum-Success badge.
  const checklistProgress = useMemo(
    () => (linkedQuest && linkedQuest.checklistMode && linkedQuest.checklistMode !== "none" ? getChecklistProgress(linkedQuest.checklist) : null),
    [linkedQuest],
  );

  if (!activeSession || isMinimized) {
    return null;
  }

  function updateChecklist(questId: string, patch: Readonly<{ checklistMode?: ChecklistMode; checklist?: ReadonlyArray<ChecklistItem>; checklistTemplateId?: string | null }>) {
    setQuestDefinitions(questDefinitions.map((item) => (item.id === questId ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item)));
  }

  function consumePendingFeedbackExtra(): FocusFinishExtra {
    const extra = pendingFeedbackExtraRef.current ?? {};
    pendingFeedbackExtraRef.current = null;
    return extra;
  }

  function handleCompleteQuest() {
    if (!linkedQuest) {
      finishSession(true, consumePendingFeedbackExtra());
      return;
    }

    const willOpenModal = Boolean(linkedQuest.linkedProgressGoalId) && Boolean(findGoalNode(goalTree, linkedQuest.linkedProgressGoalId as string));
    const accepted = beginQuestCompletion(linkedQuest);

    if (!accepted || !willOpenModal) {
      finishSession(true, consumePendingFeedbackExtra());
    }
  }

  function handleConfirmFromModal() {
    const completed = confirmQuestCompletion();

    if (completed) {
      finishSession(true, consumePendingFeedbackExtra());
    }
  }

  // FINISH QUEST - reuses the exact same "manually ended" stop concept the
  // Focus Timer already has (requestEndSession), which is what makes
  // showCompletionPrompt true below and swaps the running view for the
  // feedback form.
  function handleFinishQuestClick() {
    requestEndSession();
  }

  // Leaving an active Quest before FINISH QUEST - reuses finishSession(false)
  // exactly as the pre-existing "End Without Completing" control does:
  // records the session as interrupted, awards no XP, marks nothing
  // completed. Whatever checklist progress was made stays on the Quest
  // (checklist edits already persist immediately via updateChecklist, not
  // only at session end).
  function handleAbandonQuestSession() {
    finishSession(false);
  }

  function handleSubmitFeedback(draft: QuestFeedbackDraft) {
    pendingFeedbackExtraRef.current = {
      notes: draft.note || undefined,
      energyBefore: draft.energyBefore,
      energyAfter: draft.energyAfter,
      focusDifficulty: draft.focusDifficulty,
      taskDifficulty: draft.taskDifficulty,
      checklistMinimumSuccessReached: checklistProgress?.minimumSuccessReached,
      checklistFullCompletionReached: checklistProgress?.fullCompletionReached,
      checklistMinimumTotal: checklistProgress?.minimumTotal,
      checklistMinimumCompleted: checklistProgress?.minimumCompleted,
      checklistFullTotal: checklistProgress?.fullTotal,
      checklistFullCompleted: checklistProgress?.fullCompleted,
    };
    handleCompleteQuest();
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950 px-6 py-10 motion-reduce:transition-none">
      <button
        type="button"
        onClick={minimize}
        aria-label="Minimize focus session"
        className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 text-slate-400 transition hover:border-purple-400/50 hover:text-white"
      >
        —
      </button>

      <div className="flex w-full max-w-lg flex-col items-center gap-8 text-center">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-purple-300">{FOCUS_MODE_LABELS[activeSession.mode]}</p>
          <h1 className="text-2xl font-black text-white">{linkedQuest ? linkedQuest.title : "Free Focus Session"}</h1>
          {linkedGoalTitle || linkedDreamTitle ? (
            <p className="text-sm text-slate-500">
              {linkedGoalTitle ? linkedGoalTitle : null}
              {linkedGoalTitle && linkedDreamTitle ? " · " : null}
              {linkedDreamTitle ? linkedDreamTitle : null}
            </p>
          ) : null}
        </div>

        <FocusTimer
          remainingSeconds={isQuestExecution ? elapsedSeconds : remainingSeconds}
          totalSeconds={activeSession.durationSeconds}
          isPaused={!isRunning && !showCompletionPrompt}
          mode={isQuestExecution ? "elapsed" : "countdown"}
          size="lg"
        />

        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Today: {formatFocusMinutesLabel(todayMinutes)} focused</p>

        {isQuestExecution && linkedQuest && checklistProgress && !showCompletionPrompt ? (
          <div className="max-h-[40vh] w-full overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-left">
            <QuestChecklistTab quest={linkedQuest} onUpdate={updateChecklist} />
          </div>
        ) : null}

        {showCompletionPrompt ? (
          isQuestExecution ? (
            <QuestFinishFeedback questTitle={linkedQuest?.title ?? "this Quest"} checklistProgress={checklistProgress} onSubmit={handleSubmitFeedback} onDiscard={() => finishSession(false)} />
          ) : (
            <div className="w-full space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
              <p className="text-lg font-bold text-white">{linkedQuest ? "Did you complete this Quest?" : "Session complete."}</p>
              <div className="flex flex-wrap justify-center gap-3">
                {linkedQuest ? (
                  <button type="button" onClick={handleCompleteQuest} className={primaryButtonClass}>
                    Complete Quest
                  </button>
                ) : null}
                {canContinueWorking ? (
                  <button type="button" onClick={extendSession} className={quietButtonClass}>
                    Continue Working
                  </button>
                ) : null}
                <button type="button" onClick={() => finishSession(false)} className={quietButtonClass}>
                  End Without Completing
                </button>
              </div>
            </div>
          )
        ) : isQuestExecution ? (
          <div className="flex flex-wrap justify-center gap-3">
            {isRunning ? (
              <button type="button" onClick={pauseSession} className={quietButtonClass}>
                Pause
              </button>
            ) : (
              <button type="button" onClick={resumeSession} className={primaryButtonClass}>
                Resume
              </button>
            )}
            <button type="button" onClick={handleFinishQuestClick} className={primaryButtonClass}>
              Finish Quest
            </button>
            <button type="button" onClick={handleAbandonQuestSession} className={dangerButtonClass}>
              Abandon Session
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-3">
            {isRunning ? (
              <button type="button" onClick={pauseSession} className={quietButtonClass}>
                Pause
              </button>
            ) : (
              <button type="button" onClick={resumeSession} className={primaryButtonClass}>
                Resume
              </button>
            )}
            <button type="button" onClick={requestEndSession} className={dangerButtonClass}>
              End Session
            </button>
          </div>
        )}
      </div>

      {pendingQuest ? (
        <QuestCompletionModal
          questTitle={pendingQuest.title}
          goal={pendingGoal}
          hasLinkedGoal={Boolean(pendingQuest.linkedProgressGoalId)}
          unit={pendingQuest.completionMetric?.unit}
          progressValue={progressValue}
          onChange={setProgressValue}
          onCancel={cancelQuestCompletion}
          onConfirm={handleConfirmFromModal}
        />
      ) : null}
    </div>
  );
}
