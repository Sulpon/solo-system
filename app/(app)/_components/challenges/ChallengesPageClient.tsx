"use client";

import { useMemo } from "react";
import Card from "../Card";
import ChallengeCard from "./ChallengeCard";
import { useChallenges } from "../../_lib/hooks/useChallenges";
import { useWritingLogEntries } from "../../_lib/hooks/useWritingLogEntries";
import { useVacancyEntries } from "../../_lib/hooks/useVacancyEntries";
import { useTradeLogEntries } from "../../_lib/hooks/useTradeLogEntries";
import { getGoalMetric } from "../../_lib/goal-metrics";
import { getLocalDayKey } from "../../_lib/local-day";
import { createChallenge } from "../../_lib/types/challenge";
import type { GoalMetricContext } from "../../_lib/goal-metrics";

const BACKTEST_CHALLENGE_SEED = {
  title: "Backtest Challenge",
  description: "Complete qualifying backtest trades each day to build consistency and raise your daily capacity.",
  metricSource: "backtest-trades-logged",
  unit: "trades",
  levels: [{ target: 5 }, { target: 7 }, { target: 10 }],
  requiredStreak: 3,
} as const;

export default function ChallengesPageClient() {
  const { challenges, setChallenges, hasLoaded: challengesLoaded } = useChallenges();
  const { entries: writingLogEntries, hasLoaded: writingLogLoaded } = useWritingLogEntries();
  const { entries: vacancyEntries, hasLoaded: vacanciesLoaded } = useVacancyEntries();
  const { entries: tradeLogEntries, hasLoaded: tradeLogLoaded } = useTradeLogEntries();

  const dataReady = challengesLoaded && writingLogLoaded && vacanciesLoaded && tradeLogLoaded;
  const context: GoalMetricContext = useMemo(() => ({ writingLogEntries, vacancyEntries, tradeLogEntries }), [writingLogEntries, vacancyEntries, tradeLogEntries]);
  const todayKey = getLocalDayKey();

  const activeChallenges = useMemo(() => challenges.filter((challenge) => challenge.status === "active"), [challenges]);
  const hasBacktestChallenge = challenges.some((challenge) => challenge.metricSource === "backtest-trades-logged");

  if (!dataReady) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-500/20 bg-slate-950/45 p-5 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Atlas</p>
        <h1 className="mt-2 text-3xl font-black text-white">Challenges</h1>
        <p className="mt-2 text-sm text-slate-400">Measurable daily targets on top of your real activity - separate from Quests, never touching your existing history.</p>
      </div>

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Today&rsquo;s Challenges</p>
        {activeChallenges.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center">
            <p className="text-lg font-bold text-white">No active challenges yet</p>
            <p className="mt-2 text-sm text-slate-400">Start with the Backtest Challenge - it tracks real qualifying trades you log below.</p>
            {!hasBacktestChallenge ? (
              <button
                type="button"
                onClick={() => setChallenges((current) => [...current, createChallenge(BACKTEST_CHALLENGE_SEED)])}
                className="mt-5 rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
              >
                + Create Backtest Challenge
              </button>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {activeChallenges.map((challenge) => {
              const metric = getGoalMetric(challenge.metricSource);
              const todayValue = metric?.computeForDay ? metric.computeForDay(context, todayKey) : 0;
              return <ChallengeCard key={challenge.id} challenge={challenge} todayValue={todayValue} />;
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
