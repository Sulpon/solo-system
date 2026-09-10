"use client";

import { useState } from "react";
import { useFocus } from "../../_lib/focus-store";
import { QUEST_EXECUTION_DURATION_SECONDS } from "../../_lib/types/focus";
import type { Quest } from "../../_lib/types/quest";

type QuestExecutionControlProps = Readonly<{ quest: Quest }>;

// The primary TAKE QUEST entry point - see the Quest lifecycle this wires
// into: INACTIVE -> TAKE QUEST -> ACTIVE (checklist + Focus Session) ->
// FINISH QUEST -> feedback -> completion. The actual execution view
// (timer/checklist/finish button) lives in FocusOverlay.tsx, which already
// takes over the full screen the moment a Focus Session is active - this
// component only ever decides whether starting one is currently allowed.
// Deliberately not rendered for Habits (see AGENTS-level instruction: Habit
// completion stays period-based Done/Not Done, never checklist-driven).
export default function QuestExecutionControl({ quest }: QuestExecutionControlProps) {
  const { activeSession, startSession, expand, finishSession } = useFocus();
  const [showConflict, setShowConflict] = useState(false);

  if (quest.kind === "habit") {
    return null;
  }

  const isThisQuestActive = activeSession?.linkedQuestId === quest.id;
  const isAnotherSessionActive = Boolean(activeSession) && !isThisQuestActive;

  function handleTakeQuest() {
    if (isAnotherSessionActive) {
      setShowConflict(true);
      return;
    }

    startSession({ mode: "quest-execution", durationSeconds: QUEST_EXECUTION_DURATION_SECONDS, linkedQuestId: quest.id });
  }

  function handleEndOtherSession() {
    finishSession(false);
    setShowConflict(false);
  }

  if (isThisQuestActive) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-400/40 bg-purple-500/10 px-4 py-3">
        <p className="text-sm font-semibold text-purple-100">
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-purple-400 motion-safe:animate-pulse align-middle" aria-hidden="true" />
          Quest is active - Focus Session running.
        </p>
        <button type="button" onClick={expand} className="shrink-0 rounded-lg border border-purple-400/50 bg-purple-500/15 px-3 py-1.5 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/25">
          Return to Quest
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/45 px-4 py-3">
      {showConflict ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-white">Another Quest is currently active.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={expand} className="rounded-lg border border-purple-400/50 bg-purple-500/15 px-3 py-1.5 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/25">
              Return to active Quest
            </button>
            <button type="button" onClick={handleEndOtherSession} className="rounded-lg border border-rose-500/40 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:border-rose-300 hover:text-white">
              End current session
            </button>
            <button type="button" onClick={() => setShowConflict(false)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:text-white">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-400">Start a focused execution session for this Quest.</p>
          <button type="button" onClick={handleTakeQuest} className="shrink-0 rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
            Take Quest
          </button>
        </div>
      )}
    </div>
  );
}
