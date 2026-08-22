"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Card from "../Card";
import StatCard from "../StatCard";
import Progress from "../Progress";
import StreakDots from "./StreakDots";
import TradeLogForm from "./TradeLogForm";
import TradeLogCalendar from "./TradeLogCalendar";
import StartFocusModal from "../focus/StartFocusModal";
import LinkedMetricGoalCard from "../goal-tree/LinkedMetricGoalCard";
import { useChallenges } from "../../_lib/hooks/useChallenges";
import { useWritingLogEntries } from "../../_lib/hooks/useWritingLogEntries";
import { useVacancyEntries } from "../../_lib/hooks/useVacancyEntries";
import { useTradeLogEntries } from "../../_lib/hooks/useTradeLogEntries";
import { useProgression } from "../../_lib/hooks/useProgression";
import { useFocus } from "../../_lib/focus-store";
import { getGoalMetric } from "../../_lib/goal-metrics";
import { getCurrentLevel, getNextLevel } from "../../_lib/engines/challenge-engine";
import { getTradesLoggedThisWeek } from "../../_lib/engines/trading-engine";
import { calculateQuestStreak, getCompletionsForDay } from "../../_lib/daily-system";
import { getLocalDayKey } from "../../_lib/local-day";
import type { GoalMetricContext } from "../../_lib/goal-metrics";

type ChallengeDetailPageClientProps = Readonly<{ challengeId: string }>;

export default function ChallengeDetailPageClient({ challengeId }: ChallengeDetailPageClientProps) {
  const { challenges, hasLoaded: challengesLoaded } = useChallenges();
  const { entries: writingLogEntries, hasLoaded: writingLogLoaded } = useWritingLogEntries();
  const { entries: vacancyEntries, hasLoaded: vacanciesLoaded } = useVacancyEntries();
  const { entries: tradeLogEntries, setEntries: setTradeLogEntries, hasLoaded: tradeLogLoaded } = useTradeLogEntries();
  const { questDefinitions, questCompletions } = useProgression();
  const { activeSession, startSession, expand } = useFocus();
  const [showFocusPicker, setShowFocusPicker] = useState(false);

  const dataReady = challengesLoaded && writingLogLoaded && vacanciesLoaded && tradeLogLoaded;
  const context: GoalMetricContext = useMemo(() => ({ writingLogEntries, vacancyEntries, tradeLogEntries }), [writingLogEntries, vacancyEntries, tradeLogEntries]);
  const todayKey = getLocalDayKey();

  const challenge = challenges.find((item) => item.id === challengeId) ?? null;

  if (!dataReady) {
    return null;
  }

  if (!challenge) {
    return (
      <Card className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Challenge Not Found</p>
        <h1 className="mt-3 text-2xl font-black text-white">This challenge doesn&rsquo;t exist</h1>
        <Link href="/challenges" className="mt-5 inline-block rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
          ← Back to Challenges
        </Link>
      </Card>
    );
  }

  const metric = getGoalMetric(challenge.metricSource);
  const isBacktestChallenge = challenge.metricSource === "backtest-trades-logged";
  const todayValue = metric?.computeForDay ? metric.computeForDay(context, todayKey) : 0;
  const currentLevel = getCurrentLevel(challenge);
  const nextLevel = getNextLevel(challenge);
  const target = currentLevel?.target ?? 0;
  const progressPercent = target > 0 ? Math.min(100, Math.round((todayValue / target) * 100)) : 0;
  const metToday = target > 0 && todayValue >= target;

  const thisWeekValue = isBacktestChallenge ? getTradesLoggedThisWeek(tradeLogEntries) : 0;

  const lastEntry = challenge.history[challenge.history.length - 1] ?? null;
  const recentlyLeveledUp = Boolean(lastEntry?.leveledUp);

  const linkedQuest = challenge.linkedQuestId ? questDefinitions.find((quest) => quest.id === challenge.linkedQuestId) ?? null : null;
  const linkedQuestStreak = linkedQuest ? calculateQuestStreak(linkedQuest, questCompletions) : 0;
  const linkedQuestCompletedToday = linkedQuest ? getCompletionsForDay(questCompletions).some((completion) => completion.questId === linkedQuest.id) : false;

  function handleStartFocus(mode: Parameters<typeof startSession>[0]["mode"], durationMinutes: number) {
    startSession({ mode, durationSeconds: Math.round(durationMinutes * 60) });
    setShowFocusPicker(false);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-500/20 bg-slate-950/45 p-5 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <Link href="/challenges" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-purple-300">
          ← Challenges
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Challenge</p>
        <h1 className="mt-2 text-3xl font-black text-white">{challenge.title}</h1>
        {challenge.description ? <p className="mt-2 text-sm text-slate-400">{challenge.description}</p> : null}
      </div>

      {recentlyLeveledUp ? (
        <Card className="border-emerald-500/40 bg-emerald-500/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">New Level Unlocked</p>
          <p className="mt-2 text-xl font-black text-white">
            {lastEntry?.target} → {currentLevel?.target} {challenge.unit}/day
          </p>
        </Card>
      ) : null}

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Today&rsquo;s Objective</p>
          {metToday ? <span className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200">Target Met</span> : null}
        </div>
        <h2 className="mt-2 text-xl font-black text-white">
          Complete {target} {challenge.unit}.
        </h2>
        <div className="mt-4 flex items-end justify-between gap-3">
          <p className="text-3xl font-black text-white">
            {todayValue} / {target}
          </p>
          <p className="text-2xl font-black text-white">{progressPercent}%</p>
        </div>
        <Progress
          value={progressPercent}
          max={100}
          className="mt-3 h-3 overflow-hidden rounded-full bg-slate-900"
          fillClassName={"h-full bg-gradient-to-r " + (metToday ? "from-emerald-500 to-cyan-400" : "from-purple-500 to-cyan-400")}
        />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's Activity" value={`${todayValue} ${challenge.unit}`} accentClass="text-emerald-300" />
        <div className="rounded-2xl border border-slate-700/70 bg-slate-950/45 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Challenge Streak</p>
          <div className="mt-3">
            <StreakDots current={challenge.currentStreak} required={challenge.requiredStreak} />
          </div>
        </div>
        <StatCard label="Current Level" value={`${target} ${challenge.unit}/day`} accentClass="text-purple-300" />
        <StatCard label="Next Level" value={nextLevel ? `${nextLevel.target} ${challenge.unit}/day` : "Max level"} accentClass="text-purple-300" />
      </div>

      <LinkedMetricGoalCard
        metricId={challenge.metricSource}
        thisWeekValue={thisWeekValue}
        todayValue={todayValue}
        accentClass="text-cyan-300"
        defaultTitle={`Long-term ${challenge.title} milestone`}
        defaultTargetValue={500}
      />

      {isBacktestChallenge ? (
        <>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Log Trades</p>
            <h2 className="mt-2 text-xl font-black text-white">Record today&rsquo;s qualifying trades</h2>
            <div className="mt-4">
              <TradeLogForm onLog={(entry) => setTradeLogEntries((current) => [...current, entry])} />
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Trade Calendar</p>
            <h2 className="mt-2 text-xl font-black text-white">Daily activity</h2>
            <p className="mt-1 text-sm text-slate-400">The same records that drive today&rsquo;s objective above - edit or delete a day&rsquo;s entries and the challenge recalculates on next settlement.</p>
            <div className="mt-5">
              <TradeLogCalendar
                entries={tradeLogEntries}
                target={target}
                onUpdateEntry={(id, count) => setTradeLogEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, count } : entry)))}
                onDeleteEntry={(id) => setTradeLogEntries((current) => current.filter((entry) => entry.id !== id))}
              />
            </div>
          </Card>
        </>
      ) : null}

      {linkedQuest ? (
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Related Quest</p>
          <h2 className="mt-2 text-xl font-black text-white">{linkedQuest.title}</h2>
          <p className="mt-2 text-sm text-slate-400">Read-only - this challenge never edits Quest history.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <StatCard label="Quest Streak" value={`${linkedQuestStreak}d`} accentClass="text-slate-300" />
            <StatCard label="Completed Today" value={linkedQuestCompletedToday ? "Yes" : "No"} accentClass="text-slate-300" />
          </div>
        </Card>
      ) : null}

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Actions</p>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => (activeSession ? expand() : setShowFocusPicker(true))}
            className="rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
          >
            {activeSession ? "Resume Focus" : "Start Focus Session"}
          </button>
        </div>
      </Card>

      {showFocusPicker ? <StartFocusModal questTitle={challenge.title} onStart={handleStartFocus} onClose={() => setShowFocusPicker(false)} /> : null}
    </div>
  );
}
