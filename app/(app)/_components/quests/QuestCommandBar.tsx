"use client";

import { useMemo, useState } from "react";
import { getTodayQuests } from "../../_lib/daily-system";
import { useProgression } from "../../_lib/hooks/useProgression";
import { useRewardCollection } from "../../_lib/hooks/useRewardCollection";
import XpLedgerModal from "./XpLedgerModal";

function FlameIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M10.05 1.5c.3 2.02-.42 3.36-1.6 4.6C7.1 7.44 5.6 8.86 5.6 11.4a4.4 4.4 0 0 0 8.8 0c0-1.14-.36-1.98-.83-2.86-.16.94-.6 1.6-1.2 2.02.2-1.7-.45-2.9-1.53-3.98-.6-.6-1.2-1.32-1.3-2.3-.62.5-1.06 1.2-1.24 1.98-.5-.7-.66-1.68-.25-3.76Z" />
    </svg>
  );
}

function TrophyIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 3h8v4a4 4 0 0 1-8 0Z" />
      <path d="M6 4H3.5A1.5 1.5 0 0 0 2 5.5 3.5 3.5 0 0 0 5.5 9M14 4h2.5A1.5 1.5 0 0 1 18 5.5 3.5 3.5 0 0 1 14.5 9" />
      <path d="M10 11v3M7 17h6M8 14h4v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1Z" />
    </svg>
  );
}

function GemIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 8l3-5h6l3 5-8 9Z" />
      <path d="M4 8h12M9 3 7 8l3 9 3-9-2-5" />
    </svg>
  );
}

function ScrollIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 3h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5" />
      <path d="M5 3a2 2 0 0 0 0 4M5 13a2 2 0 0 0 0 4" />
      <path d="M8 7h5M8 10h5" />
    </svg>
  );
}

export default function QuestCommandBar() {
  const { isReady, questDefinitions, questCompletions, activityEvents, goalXpEvents, bonusXpEvents, progressionSummary } = useProgression();
  const { rewardCollection } = useRewardCollection();
  const [ledgerOpen, setLedgerOpen] = useState(false);

  const dailyGoalXp = useMemo(() => getTodayQuests(questDefinitions).reduce((sum, quest) => sum + quest.xp, 0), [questDefinitions]);
  const challengeLevelUps = useMemo(() => activityEvents.filter((event) => event.type === "challenge_level_up").length, [activityEvents]);

  if (!isReady) {
    return null;
  }

  const dailyXp = progressionSummary.dailyXP;
  const dailyGoalProgress = dailyGoalXp > 0 ? Math.min(100, Math.round((dailyXp / dailyGoalXp) * 100)) : 0;

  return (
    <>
      <div className="flex flex-col gap-4 rounded-2xl border border-purple-500/25 bg-[radial-gradient(circle_at_10%_0%,rgba(126,34,206,0.16),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.75),rgba(2,6,23,0.92))] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Today&rsquo;s Progress</p>
          <p className="mt-1 text-2xl font-black text-purple-200">+{dailyXp.toLocaleString()} XP</p>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 sm:mx-4 sm:max-w-xs">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-900 ring-1 ring-white/5">
            <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 shadow-[0_0_12px_rgba(168,85,247,0.5)] transition-all duration-300" style={{ width: `${dailyGoalProgress}%` }} />
          </div>
          <span className="shrink-0 text-xs text-slate-400">
            Daily Goal <span className="font-semibold text-white">{dailyXp.toLocaleString()}</span> / {dailyGoalXp.toLocaleString()} XP
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 rounded-xl border border-orange-400/25 bg-orange-400/5 px-3 py-2">
            <FlameIcon className="h-5 w-5 text-orange-300" />
            <div>
              <p className="text-sm font-bold leading-none text-white">{progressionSummary.currentStreak}</p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">Day Streak</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-400/5 px-3 py-2">
            <TrophyIcon className="h-5 w-5 text-amber-300" />
            <div>
              <p className="text-sm font-bold leading-none text-white">{challengeLevelUps}</p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">Challenge Lvl Ups</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-purple-400/25 bg-purple-400/5 px-3 py-2">
            <GemIcon className="h-5 w-5 text-purple-300" />
            <div>
              <p className="text-sm font-bold leading-none text-white">{rewardCollection.length}</p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">Rewards Earned</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLedgerOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-purple-400/40 bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/20"
          >
            <ScrollIcon />
            XP Ledger
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </div>

      {ledgerOpen ? (
        <XpLedgerModal
          questDefinitions={questDefinitions}
          questCompletions={questCompletions}
          goalXpEvents={goalXpEvents}
          bonusXpEvents={bonusXpEvents}
          onClose={() => setLedgerOpen(false)}
        />
      ) : null}
    </>
  );
}
