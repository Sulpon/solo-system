"use client";

import Link from "next/link";
import { useProgression } from "../../_lib/hooks/useProgression";

function ScrollIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 3h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5" />
      <path d="M5 3a2 2 0 0 0 0 4M5 13a2 2 0 0 0 0 4" />
      <path d="M8 7h5M8 10h5" />
    </svg>
  );
}

function GlobeIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M2.5 10h15M10 2.5c2.4 2 3.6 5 3.6 7.5s-1.2 5.5-3.6 7.5c-2.4-2-3.6-5-3.6-7.5S7.6 4.5 10 2.5Z" />
    </svg>
  );
}

function ShieldIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 2.5 16.5 5v5c0 4-2.8 6.8-6.5 8-3.7-1.2-6.5-4-6.5-8V5Z" />
      <path d="M7.3 10 9 11.7l3.7-3.9" />
    </svg>
  );
}

function ChestIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2.5" y="8" width="15" height="8.5" rx="1.4" />
      <path d="M2.5 11.5h15" />
      <path d="M6.5 8V6a3.5 3.5 0 0 1 7 0v2" />
      <circle cx="10" cy="11.5" r="1" />
    </svg>
  );
}

function ChartIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 17V9M9 17V5M15 17v-6" />
      <path d="M3 17h14" />
    </svg>
  );
}

const NAV_ITEMS = [
  { key: "quests", label: "Quests", icon: ScrollIcon, href: undefined },
  { key: "world", label: "World", icon: GlobeIcon, href: "/world-map" },
  { key: "character", label: "Character", icon: ShieldIcon, href: undefined },
  { key: "rewards", label: "Rewards", icon: ChestIcon, href: undefined },
  { key: "progress", label: "Progress", icon: ChartIcon, href: undefined },
] as const;

// Quests is the only page this bar exists on and the only item wired as
// "active". "World" now links to the real World Map page. Character/
// Rewards/Progress remain decorative/inert - they don't yet have a single
// natural page to point at.
export default function QuestBottomBar() {
  const { isReady, progressionSummary } = useProgression();

  if (!isReady) {
    return null;
  }

  const { currentLevel, xpInCurrentLevel, xpNeededForNextLevel } = progressionSummary;
  const levelProgress = xpNeededForNextLevel > 0 ? Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100)) : 0;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-purple-500/25 bg-[radial-gradient(circle_at_90%_100%,rgba(126,34,206,0.16),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.75),rgba(2,6,23,0.92))] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === "quests";
          const className =
            "flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition " +
            (isActive
              ? "border-purple-400/60 bg-purple-500/20 text-white shadow-[0_0_18px_rgba(168,85,247,0.22)]"
              : item.href
                ? "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-purple-400/40 hover:text-white"
                : "border-slate-800 bg-slate-950/40 text-slate-500");

          if (item.href) {
            return (
              <Link key={item.key} href={item.href} className={className}>
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          }

          return (
            <div key={item.key} className={className}>
              <Icon className="h-4 w-4" />
              {item.label}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-amber-400/50 bg-gradient-to-br from-amber-400/20 to-purple-500/20 text-lg font-black text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.25)]">
          {currentLevel}
        </div>
        <div className="w-32">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Level</p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-900 ring-1 ring-white/5">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-purple-400" style={{ width: `${levelProgress}%` }} />
          </div>
          <p className="mt-1 text-[10px] text-slate-500">
            {xpInCurrentLevel.toLocaleString()} / {xpNeededForNextLevel.toLocaleString()} XP
          </p>
        </div>
      </div>
    </div>
  );
}
