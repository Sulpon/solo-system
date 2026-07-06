"use client";

import { useEffect, useState } from "react";

const LOADING_LINES = ["Initializing Atlas...", "Building Dream Tree...", "Preparing Daily System...", "Loading Character...", "Ready."];

const LINE_INTERVAL_MS = 450;

type OnboardingLoadingTransitionProps = Readonly<{
  onDone: () => void;
}>;

export default function OnboardingLoadingTransition({ onDone }: OnboardingLoadingTransitionProps) {
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      onDone();
      return;
    }

    const timers: number[] = [];

    for (let index = 1; index < LOADING_LINES.length; index += 1) {
      timers.push(window.setTimeout(() => setLineIndex(index), LINE_INTERVAL_MS * index));
    }

    timers.push(window.setTimeout(onDone, LINE_INTERVAL_MS * LOADING_LINES.length + 250));

    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="onboarding-icon-pop mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-purple-400/30 bg-purple-500/10 text-2xl shadow-[0_0_30px_rgba(168,85,247,0.3)]">
          ✦
        </div>
        <p key={lineIndex} className="onboarding-loading-line mt-6 text-sm uppercase tracking-[0.3em] text-purple-200">
          {LOADING_LINES[lineIndex]}
        </p>
      </div>
    </div>
  );
}
