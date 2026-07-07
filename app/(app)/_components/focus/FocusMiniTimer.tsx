"use client";

import { useFocus } from "../../_lib/focus-store";
import { formatFocusDuration } from "./focus-format";

export default function FocusMiniTimer() {
  const { activeSession, remainingSeconds, isRunning, isMinimized, showCompletionPrompt, expand } = useFocus();

  if (!activeSession || !isMinimized) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={expand}
      aria-label="Return to focus session"
      className={
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition " +
        (showCompletionPrompt
          ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
          : "border-purple-400/40 bg-purple-500/10 text-purple-100 hover:bg-purple-500/20")
      }
    >
      <span className={"h-2 w-2 rounded-full " + (isRunning ? "bg-purple-400 motion-safe:animate-pulse" : "bg-slate-500")} aria-hidden="true" />
      <span className="tabular-nums">{showCompletionPrompt ? "Done" : formatFocusDuration(remainingSeconds)}</span>
    </button>
  );
}
