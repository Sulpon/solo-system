"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProgression } from "../_lib/hooks/useProgression";
import { getRankLabel } from "../_lib/engines/level-engine";
import { isNavItemActive, useAppNavItems } from "../_lib/icons/app-icon-map";

type SidebarProps = Readonly<{
  isOpen?: boolean;
  onClose?: () => void;
}>;

// Mobile-only navigation drawer - desktop navigation moved to the System
// Bar's Launcher + Dock (see app-icon-map.ts, the single shared source of
// nav items all three now read from). There is no desktop-visible trigger
// for this component anymore (TopBar's hamburger button is md:hidden), so
// it simply never renders on wide viewports.
export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { isReady, progressionSummary } = useProgression();
  const navItems = useAppNavItems();
  const currentLevel = isReady ? progressionSummary.currentLevel : 1;
  const currentRank = getRankLabel(currentLevel);
  const currentProgress = isReady ? progressionSummary.progress : 0;
  const currentXP = isReady ? progressionSummary.totalXP : 0;
  const dailyXP = isReady ? progressionSummary.dailyXP : 0;

  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={
          "fixed inset-y-0 left-0 z-50 flex h-screen w-[260px] shrink-0 basis-[260px] flex-col border-r border-purple-500/20 bg-slate-950/95 p-5 shadow-[18px_0_45px_rgba(2,6,23,0.55)] backdrop-blur-xl transition-transform duration-300 ease-out motion-reduce:transition-none " +
          (isOpen ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-purple-500/40 bg-purple-500/10 text-xl font-black text-purple-300 shadow-[0_0_24px_rgba(168,85,247,0.25)]">
            A
          </div>
          <div>
            <div className="text-2xl font-black tracking-wide text-purple-300">Atlas</div>
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Personal OS</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition hover:border-purple-400/60 hover:text-white"
          >
            ×
          </button>
        </div>

        <nav className="flex flex-col space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = isNavItemActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={onClose}
                className={
                  "flex w-full items-center gap-3 whitespace-nowrap rounded-xl border px-4 py-3 text-left text-sm transition " +
                  (isActive
                    ? "border-purple-500/40 bg-purple-500/15 text-white shadow-[0_0_24px_rgba(168,85,247,0.18)]"
                    : "border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-900/70 hover:text-white")
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.name}</span>
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
          {dailyXP > 0 ? <p className="mt-1 text-right text-xs font-semibold text-emerald-300">+{dailyXP.toLocaleString()} today</p> : null}
        </div>
      </aside>
    </>
  );
}
