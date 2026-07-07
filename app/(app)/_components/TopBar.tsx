"use client";

import { useEffect, useMemo, useState } from "react";
import { useProgression } from "../_lib/hooks/useProgression";
import AuthControl from "./AuthControl";
import FocusMiniTimer from "./focus/FocusMiniTimer";

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

type TopBarProps = Readonly<{
  onOpenMenu?: () => void;
}>;

export default function TopBar({ onOpenMenu }: TopBarProps) {
  const { isReady, progressionSummary } = useProgression();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const currentTime = useMemo(() => formatTime(now), [now]);
  const todayXp = isReady ? progressionSummary.dailyXP : 0;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-purple-500/10 pb-4 text-sm text-slate-400">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/50 text-slate-300 transition hover:border-purple-400/60 hover:text-white md:hidden"
        >
          <span aria-hidden="true">☰</span>
        </button>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Welcome back</p>
          <p className="mt-1 font-semibold text-purple-300">Atlas</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <FocusMiniTimer />
        <span className="hidden items-center gap-4 md:flex">
          <span className="rounded-full border border-slate-800 bg-slate-950/50 px-3 py-1">System Online</span>
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-cyan-200">+{todayXp} XP Today</span>
          <span className="text-cyan-300">{currentTime}</span>
        </span>
        <AuthControl />
      </div>
    </div>
  );
}
