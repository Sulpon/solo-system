"use client";

import { useEffect, useMemo } from "react";
import { useQuestExecutionSession } from "../(app)/_components/focus/useQuestExecutionSession";
import QuestCompletionModal from "../(app)/_components/quests/QuestCompletionModal";
import QuestFinishFeedback from "../(app)/_components/focus/QuestFinishFeedback";
import { useAttributes } from "../(app)/_lib/hooks/useAttributes";
import { isDesktopApp } from "../(app)/_lib/desktop/is-desktop";
import { hideFocusCompanionWindow } from "../(app)/_lib/desktop/focus-companion-window";
import { formatFocusDuration } from "../(app)/_components/focus/focus-format";
import { CompactChecklistItem, CompactProgressBar } from "../(app)/_components/focus/CompactFocusWidgets";

const buttonClass = "rounded-lg border px-3 py-2 text-xs font-semibold transition";
const primaryButtonClass = buttonClass + " border-purple-400/50 bg-purple-500/15 text-purple-100 hover:bg-purple-500/25";
const quietButtonClass = buttonClass + " border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white";

// The Focus Companion - a small always-on-top window onto the EXISTING
// Focus Session (see useQuestExecutionSession, shared verbatim with
// FocusOverlay.tsx). This page owns no execution state of its own: every
// value here comes from the same useFocus()/useProgression() hooks the
// main window uses, backed by the same localStorage keys - see
// _lib/desktop/focus-companion-window.ts for why that's sufficient to stay
// in sync with the main window with no bespoke cross-window protocol.
export default function FocusCompanionPage() {
  const {
    activeSession,
    hasLoadedSession,
    elapsedSeconds,
    isRunning,
    showCompletionPrompt,
    pauseSession,
    resumeSession,
    finishSession,
    isQuestExecution,
    linkedQuest,
    checklistProgress,
    updateChecklist,
    handleFinishQuestClick,
    handleAbandonQuestSession,
    handleSubmitFeedback,
    handleConfirmFromModal,
    pendingQuest,
    pendingGoal,
    progressValue,
    setProgressValue,
    cancelQuestCompletion,
  } = useQuestExecutionSession();
  const { attributes } = useAttributes();

  const categoryName = useMemo(
    () => (linkedQuest ? attributes.find((attribute) => attribute.id === linkedQuest.categoryId)?.name ?? null : null),
    [attributes, linkedQuest],
  );

  // Self-hides (never closes/destroys, and never touches the Focus Session)
  // the moment there's no more quest-execution session to show - covers
  // both FINISH and ABANDON uniformly, since both ultimately clear
  // activeSession via the same finishSession() call. Gated on
  // hasLoadedSession so the pre-read `null` on this window's very first
  // render doesn't cause an immediate self-hide before the real session
  // (already sitting in localStorage, written by the main window moments
  // earlier) has been read.
  useEffect(() => {
    if (!isDesktopApp() || !hasLoadedSession) {
      return;
    }

    if (!activeSession || !isQuestExecution) {
      void hideFocusCompanionWindow();
    }
  }, [activeSession, isQuestExecution, hasLoadedSession]);

  // A manual close (Alt+F4, etc.) must hide the window, not destroy it or
  // end the session - reopening later (via "Open Focus Companion" in the
  // main window) needs the window to still exist under its label.
  useEffect(() => {
    if (!isDesktopApp()) {
      return;
    }

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const off = await getCurrentWindow().onCloseRequested((event) => {
        event.preventDefault();
        void hideFocusCompanionWindow();
      });

      if (cancelled) {
        off();
      } else {
        unlisten = off;
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  function toggleChecklistItem(itemId: string) {
    if (!linkedQuest) {
      return;
    }

    const nextChecklist = (linkedQuest.checklist ?? []).map((item) => (item.id === itemId ? { ...item, completed: !item.completed } : item));
    updateChecklist(linkedQuest.id, { checklist: nextChecklist });
  }

  function handleClose() {
    void hideFocusCompanionWindow();
  }

  return (
    <div data-tauri-drag-region className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-white">
      <div data-tauri-drag-region className="flex shrink-0 items-center justify-between border-b border-slate-800 px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-purple-200">
          <span aria-hidden="true">△</span> Atlas
        </span>
        {isDesktopApp() ? (
          <button type="button" onClick={handleClose} aria-label="Close Focus Companion" className="flex h-5 w-5 items-center justify-center rounded text-slate-500 transition hover:bg-slate-800 hover:text-white">
            ×
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {!activeSession || !isQuestExecution ? (
          <div className="flex h-full items-center justify-center text-center text-xs text-slate-500">No active Quest execution session.</div>
        ) : showCompletionPrompt ? (
          <QuestFinishFeedback
            questTitle={linkedQuest?.title ?? "this Quest"}
            checklistProgress={checklistProgress}
            onSubmit={handleSubmitFeedback}
            onDiscard={() => finishSession(false)}
          />
        ) : (
          <div className="space-y-3">
            <div>
              {categoryName ? <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{categoryName}</p> : null}
              <p className="text-sm font-bold text-white">{linkedQuest?.title ?? "Quest"}</p>
            </div>

            <p className="text-center font-black tabular-nums text-white" style={{ fontSize: "2rem" }}>
              {formatFocusDuration(elapsedSeconds)}
            </p>

            {checklistProgress ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <span>Minimum Success</span>
                  <span>
                    {checklistProgress.minimumCompleted}/{checklistProgress.minimumTotal}
                  </span>
                </div>
                <CompactProgressBar percent={checklistProgress.minimumTotal === 0 ? 0 : (checklistProgress.minimumCompleted / checklistProgress.minimumTotal) * 100} />
                <p className="text-[10px] text-slate-500">
                  Full Completion: {checklistProgress.fullCompleted}/{checklistProgress.fullTotal}
                </p>
              </div>
            ) : null}

            {linkedQuest && linkedQuest.checklist && linkedQuest.checklist.length > 0 ? (
              <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/40 p-1">
                {linkedQuest.checklist.map((item) => (
                  <CompactChecklistItem key={item.id} item={item} onToggle={toggleChecklistItem} />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {activeSession && isQuestExecution && !showCompletionPrompt ? (
        <div className="shrink-0 space-y-1.5 border-t border-slate-800 px-3 py-2">
          <div className="flex gap-2">
            {isRunning ? (
              <button type="button" onClick={pauseSession} className={quietButtonClass + " flex-1"}>
                Pause
              </button>
            ) : (
              <button type="button" onClick={resumeSession} className={primaryButtonClass + " flex-1"}>
                Resume
              </button>
            )}
            <button type="button" onClick={handleFinishQuestClick} className={primaryButtonClass + " flex-1"}>
              Finish
            </button>
          </div>
          <button type="button" onClick={handleAbandonQuestSession} className="w-full text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-300/80 transition hover:text-rose-200">
            Abandon Session
          </button>
        </div>
      ) : null}

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
