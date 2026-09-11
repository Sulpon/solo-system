"use client";

import { useMemo } from "react";
import { GripHorizontal, Pause, Play } from "lucide-react";
import { useQuestExecutionSession } from "./useQuestExecutionSession";
import { CompactChecklistItem, CompactProgressBar } from "./CompactFocusWidgets";
import QuestFinishFeedback from "./QuestFinishFeedback";
import QuestCompletionModal from "../quests/QuestCompletionModal";
import { isDesktopApp } from "../../_lib/desktop/is-desktop";
import { useDraggablePosition } from "../../_lib/hooks/useDraggablePosition";
import { formatFocusDuration } from "./focus-format";
import { useAttributes } from "../../_lib/hooks/useAttributes";

const PANEL_WIDTH = 300;
const PANEL_HEIGHT = 420;
const PANEL_MARGIN = 24;

// Bottom-right by default, same convention the Tauri Companion window uses
// (see computeDefaultCompanionPosition in src-tauri/src/lib.rs and
// focus-companion-window.ts) - deliberately NOT near the top-left, which is
// where Mission Control's panel already lives in the Dashboard's normal
// content flow. Safe to reference window here: this component never
// renders any DOM until activeSession exists, which is never true during
// SSR or the first client render (see the early return below), so there is
// nothing to hydrate-mismatch against.
function getDefaultPosition() {
  if (typeof window === "undefined") {
    return { x: PANEL_MARGIN, y: PANEL_MARGIN };
  }

  return {
    x: Math.max(PANEL_MARGIN, window.innerWidth - PANEL_WIDTH - PANEL_MARGIN),
    y: Math.max(PANEL_MARGIN, window.innerHeight - PANEL_HEIGHT - PANEL_MARGIN),
  };
}

const buttonClass = "rounded-lg border px-3 py-2 text-xs font-semibold transition";
const primaryButtonClass = buttonClass + " border-purple-400/50 bg-purple-500/15 text-purple-100 hover:bg-purple-500/25";
const quietButtonClass = buttonClass + " border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white";

// The browser equivalent of the Tauri Focus Companion window
// (app/focus-companion/page.tsx) - same shared useQuestExecutionSession()
// hook, same reused QuestFinishFeedback/QuestCompletionModal/checklist
// widgets, zero duplicated completion/XP logic. This is what "minimized"
// looks like in the browser (isDesktopApp() is false there, so the native
// Companion window never exists) - it is not a third Focus-session state,
// it renders under the exact same isMinimized flag FocusMiniTimer already
// reads (see focus-store.tsx), just with the richer view. Mounted globally
// in app/(app)/layout.tsx, same pattern as FocusOverlay/ActiveWorkoutOverlay.
export default function BrowserFocusCompanion() {
  const {
    activeSession,
    isMinimized,
    isQuestExecution,
    linkedQuest,
    elapsedSeconds,
    isRunning,
    showCompletionPrompt,
    checklistProgress,
    updateChecklist,
    pauseSession,
    resumeSession,
    finishSession,
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
  const { position, handlePointerDown } = useDraggablePosition("atlas-browser-focus-companion-position", getDefaultPosition(), { width: PANEL_WIDTH, height: PANEL_HEIGHT });

  const categoryName = useMemo(
    () => (linkedQuest ? attributes.find((attribute) => attribute.id === linkedQuest.categoryId)?.name ?? null : null),
    [attributes, linkedQuest],
  );

  function toggleChecklistItem(itemId: string) {
    if (!linkedQuest) {
      return;
    }

    const nextChecklist = (linkedQuest.checklist ?? []).map((item) => (item.id === itemId ? { ...item, completed: !item.completed } : item));
    updateChecklist(linkedQuest.id, { checklist: nextChecklist });
  }

  if (isDesktopApp() || !activeSession || !isQuestExecution || !isMinimized) {
    return null;
  }

  return (
    <div
      className="fixed z-[45] flex flex-col overflow-hidden rounded-2xl border border-purple-400/30 bg-slate-950/95 shadow-[0_25px_70px_rgba(2,6,23,0.6)] backdrop-blur-xl"
      style={{ left: position.x, top: position.y, width: PANEL_WIDTH }}
    >
      <div onPointerDown={handlePointerDown} className="flex cursor-move items-center gap-2 border-b border-slate-800 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-purple-200">
        <GripHorizontal className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
        <span>Atlas Focus</span>
      </div>

      <div className="max-h-[70vh] overflow-y-auto px-3 py-3">
        {showCompletionPrompt ? (
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

      {!showCompletionPrompt ? (
        <div className="shrink-0 space-y-1.5 border-t border-slate-800 px-3 py-2">
          <div className="flex gap-2">
            {isRunning ? (
              <button type="button" onClick={pauseSession} className={quietButtonClass + " flex-1"}>
                <Pause className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" /> Pause
              </button>
            ) : (
              <button type="button" onClick={resumeSession} className={primaryButtonClass + " flex-1"}>
                <Play className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" /> Resume
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
