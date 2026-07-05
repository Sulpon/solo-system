"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { DailyQuest } from "../_lib/types";
import { calculateTotalXP } from "../_lib/engines/progression-engine";
import { getLocalDayKey } from "../_lib/local-day";
import { useProgression } from "../_lib/hooks/useProgression";
import Card from "./Card";
import Progress from "./Progress";
import QuestCard from "./QuestCard";
import QuestCompletionModal from "./quests/QuestCompletionModal";
import { useQuestCompletionFlow } from "./quests/useQuestCompletionFlow";

type DailyQuestsCardProps = Readonly<{
  quests: DailyQuest[];
}>;

export default function DailyQuestsCard({ quests }: DailyQuestsCardProps) {
  const { isReady, questCompletions, clearQuestCompletionsForDay } = useProgression();
  const {
    pendingQuest,
    pendingGoal,
    progressValue,
    setProgressValue,
    beginQuestCompletion,
    confirmQuestCompletion,
    cancelQuestCompletion,
    removeQuestCompletion,
  } = useQuestCompletionFlow();

  const todayKey = useMemo(() => getLocalDayKey(), []);
  const todayCompletedIds = useMemo(
    () => new Set(questCompletions.filter((completion) => getLocalDayKey(completion.completedAt) === todayKey).map((completion) => completion.questId)),
    [questCompletions, todayKey],
  );

  const questsWithCompletion = useMemo(
    () =>
      quests.map((quest) => ({
        ...quest,
        completed: todayCompletedIds.has(quest.id),
      })),
    [quests, todayCompletedIds],
  );

  const totalAvailableXp = useMemo(
    () => quests.reduce((total, quest) => total + quest.xp, 0),
    [quests],
  );

  const todayXp = useMemo(
    () => calculateTotalXP(questsWithCompletion),
    [questsWithCompletion],
  );

  function toggleQuest(id: string) {
    if (todayCompletedIds.has(id)) {
      removeQuestCompletion(id);
      return;
    }

    const quest = quests.find((item) => item.id === id);

    if (!quest) {
      return;
    }

    beginQuestCompletion(quest);
  }

  function resetDay() {
    clearQuestCompletionsForDay();
  }

  if (!isReady) {
    return (
      <Card className="overflow-hidden border-purple-500/25 bg-[radial-gradient(circle_at_12%_0%,rgba(126,34,206,0.18),transparent_24%),linear-gradient(135deg,rgba(15,23,42,0.7),rgba(2,6,23,0.9))] p-5">
        <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4 text-sm text-slate-400">
          Loading daily quests...
        </div>
      </Card>
    );
  }

  if (quests.length === 0) {
    return (
      <Card className="overflow-hidden border-purple-500/25 bg-[radial-gradient(circle_at_12%_0%,rgba(126,34,206,0.18),transparent_24%),linear-gradient(135deg,rgba(15,23,42,0.7),rgba(2,6,23,0.9))] p-5">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/60 to-transparent" />
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-6 text-center">
          <h2 className="text-xl font-black uppercase tracking-[0.08em] text-purple-300">Daily Quests</h2>
          <p className="mt-3 text-sm text-slate-400">No quests yet</p>
          <p className="mt-1 text-sm text-slate-500">Create your first quest to start earning XP</p>
          <Link
            href="/quests"
            className="mt-5 inline-flex rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
          >
            Create First Quest
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-purple-500/25 bg-[radial-gradient(circle_at_12%_0%,rgba(126,34,206,0.18),transparent_24%),linear-gradient(135deg,rgba(15,23,42,0.7),rgba(2,6,23,0.9))] p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/60 to-transparent" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-[0.08em] text-purple-300">Daily Quests</h2>
          <p className="mt-1 text-sm text-slate-400">
            {todayCompletedIds.size} / {quests.length} completed
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[360px]">
          <div className="rounded-xl border border-purple-500/25 bg-purple-500/10 p-3 shadow-[0_0_18px_rgba(168,85,247,0.12)]">
            <p className="text-xs text-slate-500">TODAY'S XP</p>
            <p className="mt-1 text-2xl font-bold text-purple-300">+{todayXp}</p>
          </div>
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/55 p-3">
            <p className="text-xs text-slate-500">AVAILABLE</p>
            <p className="mt-1 text-2xl font-bold">{totalAvailableXp}</p>
          </div>
          <div className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 p-3 shadow-[0_0_18px_rgba(34,211,238,0.1)]">
            <p className="text-xs text-slate-500">COMPLETE</p>
            <p className="mt-1 text-2xl font-bold text-cyan-300">
              {todayCompletedIds.size}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex justify-between text-sm text-slate-400">
          <span>Daily XP Progress</span>
          <span>
            {todayXp} / {totalAvailableXp} XP
          </span>
        </div>
        <Progress
          value={todayXp}
          max={totalAvailableXp}
          className="h-3 overflow-hidden rounded-full bg-slate-950/80"
          fillClassName="h-full bg-gradient-to-r from-purple-500 to-cyan-400"
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-5">
        {questsWithCompletion.map((quest) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            completed={quest.completed}
            onToggle={toggleQuest}
          />
        ))}
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={resetDay}
          className="rounded-xl border border-purple-500/25 bg-slate-950/45 px-4 py-2 text-sm text-slate-300 transition hover:border-purple-400/60 hover:text-white hover:shadow-[0_0_18px_rgba(168,85,247,0.14)]"
        >
          Reset Day
        </button>
      </div>

      {pendingQuest ? (
        <QuestCompletionModal
          questTitle={pendingQuest.title}
          goal={pendingGoal}
          progressValue={progressValue}
          onChange={setProgressValue}
          onCancel={cancelQuestCompletion}
          onConfirm={confirmQuestCompletion}
        />
      ) : null}
    </Card>
  );
}
