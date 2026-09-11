"use client";

import { useMemo, useRef } from "react";
import { useFocus, type FocusFinishExtra } from "../../_lib/focus-store";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { useProgression } from "../../_lib/hooks/useProgression";
import { findGoalNode } from "../../_lib/goal-tree-storage";
import { getChecklistProgress } from "../../_lib/engines/checklist-engine";
import { useQuestCompletionFlow } from "../quests/useQuestCompletionFlow";
import type { QuestFeedbackDraft } from "./QuestFinishFeedback";
import type { ChecklistItem, ChecklistMode } from "../../_lib/types/quest";

// Shared TAKE QUEST -> ... -> FINISH QUEST/Abandon orchestration for every
// UI that drives the existing Focus Session's quest-execution mode -
// currently FocusOverlay.tsx (the main window's full-screen view) and the
// Focus Companion window. Extracted so there is exactly ONE place this
// logic lives - both UIs call the same useFocus()/useQuestCompletionFlow()
// primitives underneath, so they can never drift into two separate
// completion systems. This hook owns no persistent state itself; the
// feedback-stash ref exists only to bridge the synchronous
// QuestFinishFeedback submit to the (possibly async, goal-linked-quest)
// completion confirmation, exactly as it did inline in FocusOverlay before.
export function useQuestExecutionSession() {
  const focus = useFocus();
  const { activeSession, finishSession, requestEndSession } = focus;
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
  const pendingFeedbackExtraRef = useRef<FocusFinishExtra | null>(null);

  const isQuestExecution = activeSession?.mode === "quest-execution";

  const linkedQuest = useMemo(
    () => (activeSession?.linkedQuestId ? questDefinitions.find((quest) => quest.id === activeSession.linkedQuestId) ?? null : null),
    [activeSession?.linkedQuestId, questDefinitions],
  );
  // null (not shown) when the linked Quest has no checklist at all - see
  // "Read 20 pages" in the Quest execution spec: a no-checklist Quest's
  // execution view and feedback form simply omit checklist state entirely,
  // rather than showing an empty/zeroed Minimum-Success badge.
  const checklistProgress = useMemo(
    () => (linkedQuest && linkedQuest.checklistMode && linkedQuest.checklistMode !== "none" ? getChecklistProgress(linkedQuest.checklist) : null),
    [linkedQuest],
  );

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
  // showCompletionPrompt true and swaps the running view for the feedback
  // form, in whichever UI is currently showing it.
  function handleFinishQuestClick() {
    requestEndSession();
  }

  // Leaving an active Quest before FINISH QUEST - reuses finishSession(false)
  // exactly as the pre-existing "End Without Completing" control does:
  // records the session as interrupted, awards no XP/Coins, marks nothing
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

  return {
    ...focus,
    isQuestExecution,
    linkedQuest,
    checklistProgress,
    updateChecklist,
    handleCompleteQuest,
    handleFinishQuestClick,
    handleAbandonQuestSession,
    handleSubmitFeedback,
    handleConfirmFromModal,
    pendingQuest,
    pendingGoal,
    progressValue,
    setProgressValue,
    cancelQuestCompletion,
  } as const;
}
