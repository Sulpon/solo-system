"use client";

import { formatFocusDuration } from "./focus-format";

type FocusTimerProps = Readonly<{
  // In "elapsed" mode this is the elapsed-time value to display (there is
  // no target to count down from - see quest-execution in types/focus.ts),
  // and the ring shows a plain "active" indicator instead of a percentage
  // fill. In "countdown" mode (the default, every pre-existing usage)
  // behavior is unchanged.
  remainingSeconds: number;
  totalSeconds: number;
  isPaused: boolean;
  size?: "lg" | "md";
  mode?: "countdown" | "elapsed";
}>;

export default function FocusTimer({ remainingSeconds, totalSeconds, isPaused, size = "lg", mode = "countdown" }: FocusTimerProps) {
  const safeTotal = Math.max(1, totalSeconds);
  const elapsedPercent = mode === "countdown" ? Math.min(100, Math.max(0, ((safeTotal - remainingSeconds) / safeTotal) * 100)) : 100;
  const dimensions = size === "lg" ? "h-72 w-72" : "h-40 w-40";
  const innerDimensions = size === "lg" ? "h-64 w-64" : "h-36 w-36";
  const textSize = size === "lg" ? "text-6xl" : "text-3xl";

  return (
    <div
      className={"flex shrink-0 items-center justify-center rounded-full border border-purple-400/20 transition-[background] duration-1000 ease-linear motion-reduce:transition-none " + dimensions}
      style={{
        background:
          mode === "countdown" ? `conic-gradient(rgba(168,85,247,0.9) ${elapsedPercent * 3.6}deg, rgba(15,23,42,0.7) 0deg)` : "rgba(168,85,247,0.14)",
      }}
      role="timer"
      aria-live="off"
    >
      <div className={"flex flex-col items-center justify-center gap-2 rounded-full border border-slate-800 bg-slate-950 " + innerDimensions}>
        <span className={"font-black tabular-nums text-white " + textSize}>{formatFocusDuration(Math.max(0, remainingSeconds))}</span>
        {isPaused ? <span className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">Paused</span> : null}
      </div>
    </div>
  );
}
