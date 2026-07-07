"use client";

import { useMemo } from "react";
import { useFocus } from "../../_lib/focus-store";
import { useFocusHistory } from "../../_lib/hooks/useFocusHistory";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { useProgression } from "../../_lib/hooks/useProgression";
import { findGoalNode } from "../../_lib/goal-tree-storage";
import { getTodayFocusMinutes } from "../../_lib/focus-stats";
import { FOCUS_MODE_LABELS } from "../../_lib/types/focus";
import { useQuestCompletionFlow } from "../quests/useQuestCompletionFlow";
import QuestCompletionModal from "../quests/QuestCompletionModal";
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
  const { questDefinitions } = useProgression();
  const {
    pendingQuest,
    pendingGoal,
    progressValue,
    setProgressValue,
    beginQuestCompletion,
    confirmQuestCompletion,
    cancelQuestCompletion,
  } = useQuestCompletionFlow();

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

  if (!activeSession || isMinimized) {
    return null;
  }

  function handleCompleteQuest() {
    if (!linkedQuest) {
      finishSession(true);
      return;
    }

    const willOpenModal = Boolean(linkedQuest.linkedProgressGoalId) && Boolean(findGoalNode(goalTree, linkedQuest.linkedProgressGoalId as string));
    const accepted = beginQuestCompletion(linkedQuest);

    if (!accepted || !willOpenModal) {
      finishSession(true);
    }
  }

  function handleConfirmFromModal() {
    const completed = confirmQuestCompletion();

    if (completed) {
      finishSession(true);
    }
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

        <FocusTimer remainingSeconds={remainingSeconds} totalSeconds={activeSession.durationSeconds} isPaused={!isRunning && !showCompletionPrompt} size="lg" />

        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Today: {formatFocusMinutesLabel(todayMinutes)} focused</p>

        {showCompletionPrompt ? (
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
          progressValue={progressValue}
          onChange={setProgressValue}
          onCancel={cancelQuestCompletion}
          onConfirm={handleConfirmFromModal}
        />
      ) : null}
    </div>
  );
}
