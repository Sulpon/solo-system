"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "../_lib/mock-data";
import { useProgression } from "../_lib/hooks/useProgression";

function getRankLabel(level: number) {
  if (level >= 30) {
    return "S";
  }

  if (level >= 24) {
    return "A";
  }

  if (level >= 18) {
    return "B";
  }

  if (level >= 12) {
    return "C";
  }

  return "D";
}

export default function Sidebar() {
  const pathname = usePathname();
  const { isReady, progressionSummary } = useProgression();
  const currentLevel = isReady ? progressionSummary.currentLevel : 1;
  const currentRank = getRankLabel(currentLevel);
  const currentProgress = isReady ? progressionSummary.progress : 0;
  const currentXP = isReady ? progressionSummary.totalXP : 0;

  return (
    <aside className="sticky top-0 flex h-screen w-[260px] shrink-0 basis-[260px] flex-col border-r border-purple-500/20 bg-slate-950/70 p-5 shadow-[18px_0_45px_rgba(2,6,23,0.55)] backdrop-blur-xl">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-purple-500/40 bg-purple-500/10 text-xl font-black text-purple-300 shadow-[0_0_24px_rgba(168,85,247,0.25)]">
          M
        </div>
        <div>
          <div className="text-2xl font-black tracking-wide text-purple-300">MENACE</div>
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">System UI</div>
        </div>
      </div>

      <nav className="flex flex-col space-y-2">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={
                "block w-full whitespace-nowrap rounded-xl border px-4 py-3 text-left text-sm transition " +
                (isActive
                  ? "border-purple-500/40 bg-purple-500/15 text-white shadow-[0_0_24px_rgba(168,85,247,0.18)]"
                  : "border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-900/70 hover:text-white")
              }
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-purple-500/30 bg-slate-900/70 p-4 shadow-[0_0_30px_rgba(88,28,135,0.18)]">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Current Rank</p>
        <div className="mt-3 flex items-end justify-between">
          <p className="text-5xl font-black text-purple-300">{currentRank}</p>
          <div className="text-right">
            <p className="text-sm text-slate-400">Level</p>
            <p className="text-2xl font-bold text-white">{currentLevel}</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800 ring-1 ring-white/5">
          <div className="h-full bg-purple-500 shadow-[0_0_18px_rgba(168,85,247,0.55)]" style={{ width: `${currentProgress}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>XP {currentXP.toLocaleString()}</span>
          <span>{currentProgress}%</span>
        </div>
      </div>
    </aside>
  );
}
