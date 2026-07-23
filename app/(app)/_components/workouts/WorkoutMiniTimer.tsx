"use client";

import { useWorkout } from "../../_lib/workout-store";
import { formatFocusDuration } from "../focus/focus-format";

export default function WorkoutMiniTimer() {
  const { activeSession, elapsedSeconds, isMinimized, expand } = useWorkout();

  if (!activeSession || !isMinimized) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={expand}
      aria-label="Return to workout session"
      className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
    >
      <span className="h-2 w-2 rounded-full bg-emerald-400 motion-safe:animate-pulse" aria-hidden="true" />
      <span className="tabular-nums">{formatFocusDuration(elapsedSeconds)}</span>
    </button>
  );
}
