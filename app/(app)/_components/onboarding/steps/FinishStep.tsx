"use client";

import { useEffect, useState } from "react";
import type { Category } from "../../../_lib/types/category";

type FinishStepProps = Readonly<{
  attributes: Category[];
  dreamTitle: string;
  goalTitle: string;
  questTitle: string;
  onLaunch: () => void;
}>;

function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setValue(target);
      return;
    }

    let frameId: number;
    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(progress * target));

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, durationMs]);

  return value;
}

function StatTile({ label, value }: Readonly<{ label: string; value: number }>) {
  const animatedValue = useCountUp(value);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4 text-center">
      <p className="text-3xl font-black text-white tabular-nums">{animatedValue}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
    </div>
  );
}

function RecapRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/45 px-4 py-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <span className="min-w-0 truncate text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

export default function FinishStep({ attributes, dreamTitle, goalTitle, questTitle, onLaunch }: FinishStepProps) {
  return (
    <div className="text-center">
      <div className="onboarding-success-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-3xl shadow-[0_0_40px_rgba(52,211,153,0.25)]">
        ✓
      </div>

      <h2 className="mt-6 text-3xl font-black text-white sm:text-4xl">Character Created</h2>
      <p className="mt-2 text-sm text-slate-400">Today&apos;s Journey Begins.</p>

      <div className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Level" value={1} />
        <StatTile label="Dreams" value={1} />
        <StatTile label="Attributes" value={attributes.length} />
        <StatTile label="Mission Ready" value={1} />
      </div>

      <div className="mx-auto mt-8 max-w-md space-y-2 text-left">
        <RecapRow label="Dream" value={dreamTitle} />
        <RecapRow label="Goal" value={goalTitle} />
        <RecapRow label="Core Quest" value={questTitle} />
      </div>

      <button
        type="button"
        onClick={onLaunch}
        className="mt-10 rounded-xl border border-purple-400/50 bg-purple-500/15 px-10 py-3 text-sm font-bold uppercase tracking-[0.18em] text-purple-100 transition hover:bg-purple-500/25 hover:scale-[1.03] active:scale-[0.98]"
      >
        Enter Atlas
      </button>
    </div>
  );
}
