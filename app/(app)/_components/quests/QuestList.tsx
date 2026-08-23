"use client";

import { useEffect, useState } from "react";
import { useAttributes } from "../../_lib/hooks/useAttributes";
import { isQuestScheduledForDate, calculateQuestStreak, calculateQuestConsistency, calculateStreakXpBonus } from "../../_lib/daily-system";
import { deriveChallengeProgress } from "../../_lib/engines/challenge-engine";
import { calculateQuestMastery, getNextIdentityMilestone, getQuestMasteryLevel100Target, getQuestMasteryTitle, getQuestMasteryXP } from "../../_lib/engines/quest-mastery-engine";
import { getConsistencyTier } from "../../_lib/engines/quest-visual-engine";
import { getLocalDayKey } from "../../_lib/local-day";
import ChallengeStreakDots from "./ChallengeStreakDots";
import QuestIcon, { ConsistencyBadgeGlyph, getQuestIconKey } from "./QuestIcon";
import type { Quest, QuestCompletion } from "../../_lib/types/quest";

type QuestListProps = Readonly<{
  quests: Quest[];
  questCompletions?: ReadonlyArray<QuestCompletion>;
  completedTodayIds?: ReadonlySet<string>;
  referenceDate?: Date;
  onEdit: (quest: Quest) => void;
  onToggleStatus: (quest: Quest) => void;
  onDelete: (questId: string) => void;
  onComplete: (quest: Quest) => void;
  onUndoComplete?: (quest: Quest) => void;
  onStartWorkout?: (quest: Quest) => void;
}>;

function formatSchedule(quest: Quest) {
  const days = quest.scheduledDays ?? [];

  if (days.length === 0) {
    return "Every day";
  }

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
  return days.map((day) => weekdayLabels[day] ?? "").filter(Boolean).join(", ");
}

function CheckmarkIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M4 10.5 8 14.5 16 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FlameIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M10.05 1.5c.3 2.02-.42 3.36-1.6 4.6C7.1 7.44 5.6 8.86 5.6 11.4a4.4 4.4 0 0 0 8.8 0c0-1.14-.36-1.98-.83-2.86-.16.94-.6 1.6-1.2 2.02.2-1.7-.45-2.9-1.53-3.98-.6-.6-1.2-1.32-1.3-2.3-.62.5-1.06 1.2-1.24 1.98-.5-.7-.66-1.68-.25-3.76Z" />
    </svg>
  );
}

function KebabIcon() {
  return (
    <svg viewBox="0 0 4 16" fill="currentColor" className="h-4 w-4">
      <circle cx="2" cy="2" r="1.6" />
      <circle cx="2" cy="8" r="1.6" />
      <circle cx="2" cy="14" r="1.6" />
    </svg>
  );
}

function ConsistencyRing({ percent, colorHex }: { percent: number; colorHex: string }) {
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference * (1 - clamped / 100);

  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 -rotate-90">
      <circle cx="16" cy="16" r={radius} fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-800" />
      <circle
        cx="16"
        cy="16"
        r={radius}
        fill="none"
        stroke={colorHex}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-300"
      />
    </svg>
  );
}

export default function QuestList({
  quests,
  questCompletions = [],
  completedTodayIds,
  referenceDate = new Date(),
  onEdit,
  onToggleStatus,
  onDelete,
  onComplete,
  onUndoComplete,
  onStartWorkout,
}: QuestListProps) {
  const { attributes: categories } = useAttributes();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!openMenuId) {
      return;
    }

    function closeMenu() {
      setOpenMenuId(null);
    }

    window.addEventListener("scroll", closeMenu, true);
    return () => window.removeEventListener("scroll", closeMenu, true);
  }, [openMenuId]);

  function getCategoryName(id: Quest["categoryId"]) {
    return categories.find((category) => category.id === id)?.name ?? id;
  }

  return (
    <div className="mt-5 space-y-2">
      {quests.map((quest) => {
        const isCompleted = completedTodayIds?.has(quest.id) ?? false;
        const isScheduled = isQuestScheduledForDate(quest, referenceDate);
        const streak = calculateQuestStreak(quest, questCompletions, referenceDate);
        const projectedStreakDays = isCompleted ? streak : streak + 1;
        // Once completed, show the real recorded bonuses (including any
        // Challenge level-up bonus, which can't be projected in advance)
        // instead of the forward-looking streak-only estimate.
        const todaysCompletion = isCompleted
          ? questCompletions.find((completion) => completion.questId === quest.id && getLocalDayKey(completion.completedAt) === getLocalDayKey(referenceDate))
          : undefined;
        const streakBonusXp = todaysCompletion ? todaysCompletion.streakBonusXp : calculateStreakXpBonus(quest.xp, projectedStreakDays);
        const challengeBonusXp = todaysCompletion?.challengeBonusXp ?? 0;
        const consistency = calculateQuestConsistency(quest, questCompletions, referenceDate);
        const tier = getConsistencyTier(consistency);
        const isCore = (quest.importance ?? "core") === "core";
        const menuOpen = openMenuId === quest.id;
        const challengeProgress = quest.challenge?.enabled ? deriveChallengeProgress(quest, questCompletions, referenceDate) : null;
        const iconKey = getQuestIconKey(quest.title);
        const challengeUnit = quest.completionMetric?.unit ? ` ${quest.completionMetric.unit}` : "";
        const masteryXP = getQuestMasteryXP(quest.id, questCompletions);
        const level100Target = getQuestMasteryLevel100Target(quest.xp, quest.masteryMultiplier);
        const mastery = calculateQuestMastery(masteryXP, level100Target);
        const masteryTitle = getQuestMasteryTitle(mastery.currentLevel);
        const nextIdentity = getNextIdentityMilestone(masteryXP, level100Target);

        function toggleComplete() {
          if (isCompleted) {
            onUndoComplete?.(quest);
            return;
          }

          if (isScheduled) {
            onComplete(quest);
          }
        }

        return (
          <div
            key={quest.id}
            className={
              "flex items-center gap-3 rounded-xl border bg-slate-900/50 px-3 py-2.5 transition duration-150 " +
              (isCompleted
                ? "border-emerald-500/50 shadow-[0_0_14px_rgba(16,185,129,0.14)]"
                : `${tier.borderClass} hover:border-slate-600 ${tier.glowClass}`)
            }
          >
            <button
              type="button"
              onClick={toggleComplete}
              disabled={!isCompleted && !isScheduled}
              aria-label={isCompleted ? "Undo completion" : "Mark complete"}
              className={
                "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition " +
                (isCompleted
                  ? "border-emerald-400 bg-emerald-500/15 text-emerald-200"
                  : isScheduled
                    ? `${tier.borderClass} ${tier.bgClass} ${tier.textClass} hover:brightness-110`
                    : "cursor-not-allowed border-slate-800 bg-slate-950/40 text-slate-600 opacity-50")
              }
            >
              {tier.hasParticles && !isCompleted ? (
                <>
                  <span className="consistency-particle absolute -top-1 left-1 h-1 w-1 rounded-full bg-current" style={{ animationDelay: "0s" }} />
                  <span className="consistency-particle absolute -right-1 top-2 h-1 w-1 rounded-full bg-current" style={{ animationDelay: "0.6s" }} />
                  <span className="consistency-particle absolute -bottom-1 left-3 h-1 w-1 rounded-full bg-current" style={{ animationDelay: "1.1s" }} />
                </>
              ) : null}
              <QuestIcon iconKey={iconKey} className="h-5 w-5" />
              {isCompleted ? (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-emerald-400 bg-emerald-500 text-slate-950">
                  <CheckmarkIcon className="h-2.5 w-2.5" />
                </span>
              ) : null}
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <h3 className="truncate text-sm font-bold text-white">{quest.title}</h3>
                <span className="shrink-0 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-yellow-200">
                  Lv {mastery.currentLevel} · {masteryTitle}
                </span>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{getCategoryName(quest.categoryId)}</span>
                {quest.status === "archived" ? (
                  <span className="shrink-0 rounded-full border border-slate-700 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">Archived</span>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] leading-none">
                <span
                  className={
                    isCore
                      ? "rounded-full border border-cyan-400/25 bg-cyan-400/10 px-1.5 py-0.5 font-semibold text-cyan-200"
                      : "rounded-full border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 font-semibold text-amber-200"
                  }
                >
                  {isCore ? "Core" : "Bonus"}
                </span>
                <span className="rounded-full border border-slate-700 px-1.5 py-0.5 text-slate-400">{quest.cadence.replace("-", " ")}</span>
                <span className="rounded-full border border-slate-700 bg-slate-950/50 px-1.5 py-0.5 text-slate-400">{formatSchedule(quest)}</span>
                {quest.linkedProgressGoalId ? <span className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-1.5 py-0.5 text-cyan-200">Linked Goal</span> : null}
                {quest.linkedWorkoutTemplateId ? <span className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-1.5 py-0.5 text-emerald-200">Linked Workout</span> : null}
                {streak > 0 ? (
                  <span className="text-slate-500">
                    <span className="font-semibold text-orange-300">{streak}</span> day streak
                  </span>
                ) : null}
              </div>

              <div className="mt-1.5 flex items-center gap-2 text-[11px] leading-none">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-900">
                  <div className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-300" style={{ width: `${mastery.progressTowardLevel100Percent}%` }} />
                </div>
                <span className="shrink-0 text-slate-500">
                  <span className="font-semibold text-yellow-200">{mastery.masteryXP.toLocaleString()}</span> / {mastery.level100Target.toLocaleString()} Mastery XP
                  {nextIdentity ? (
                    <>
                      {" "}
                      · Next: <span className="font-semibold text-yellow-200">{nextIdentity.title}</span> in {nextIdentity.xpNeeded.toLocaleString()} XP
                    </>
                  ) : null}
                </span>
              </div>

              {challengeProgress && quest.challenge ? (
                <div
                  className={
                    "mt-2 rounded-lg border px-2.5 py-1.5 text-[11px] leading-none " +
                    (challengeProgress.todaySettled ? (challengeProgress.todayPassed ? "border-emerald-400/20 bg-emerald-400/5" : "border-rose-400/20 bg-rose-400/5") : "border-amber-400/15 bg-amber-400/5")
                  }
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    {challengeProgress.todaySettled ? (
                      <span className={"font-semibold " + (challengeProgress.todayPassed ? "text-emerald-300" : "text-rose-300")}>{challengeProgress.todayPassed ? "✓ Challenge succeeded" : "✗ Challenge failed"}</span>
                    ) : (
                      <span className="text-slate-400">
                        Today&rsquo;s target: <span className="font-semibold text-white">{challengeProgress.todayTarget}{challengeUnit}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-slate-400">
                      Streak: <ChallengeStreakDots current={challengeProgress.currentStreak} required={quest.challenge.requiredStreak} />
                    </span>
                    <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-2 py-0.5 font-semibold text-purple-200">
                      Level {challengeProgress.currentLevelIndex + 1}/{quest.challenge.levels.length}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-900">
                      <div
                        className={"h-full rounded-full " + (challengeProgress.todayPassed ? "bg-emerald-400" : challengeProgress.todaySettled ? "bg-rose-400" : "bg-amber-400")}
                        style={{ width: `${Math.min(100, Math.round((challengeProgress.todayValue / Math.max(1, challengeProgress.todayTarget)) * 100))}%` }}
                      />
                    </div>
                    <span className="shrink-0 font-semibold text-white">
                      {challengeProgress.todayValue} / {challengeProgress.todayTarget}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-4">
              <div className="flex w-10 flex-col items-center gap-0.5">
                <span className="flex items-center gap-1 text-sm font-bold text-orange-300">
                  <FlameIcon />
                  {streak}
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Streak</span>
              </div>

              <div className="flex w-14 flex-col items-center gap-0.5">
                <div className={"relative flex h-8 w-8 items-center justify-center " + (tier.hasParticles ? "consistency-glow-pulse" : "")}>
                  <ConsistencyRing percent={consistency} colorHex={tier.ringHex} />
                  <span className="absolute text-[9px] font-bold text-white">{consistency}</span>
                </div>
                <span className={"flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.1em] " + tier.textClass}>
                  <ConsistencyBadgeGlyph icon={tier.badgeIcon} className="h-2.5 w-2.5" />
                  {tier.label}
                </span>
              </div>

              <div className="flex w-10 flex-col items-center gap-0.5">
                <span className="text-sm font-bold text-purple-200">
                  {quest.xp}
                  {streakBonusXp > 0 ? <span className="ml-0.5 text-[11px] font-semibold text-emerald-300">+{streakBonusXp}</span> : null}
                  {challengeBonusXp > 0 ? <span className="ml-0.5 text-[11px] font-semibold text-amber-300">+{challengeBonusXp}</span> : null}
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">XP</span>
              </div>

              {isCompleted ? (
                <span className="rounded-full border border-emerald-400/50 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200">Logged</span>
              ) : isScheduled && quest.linkedWorkoutTemplateId && onStartWorkout ? (
                <button
                  type="button"
                  onClick={() => onStartWorkout(quest)}
                  className="rounded-full border border-emerald-500/50 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
                >
                  Start Workout
                </button>
              ) : isScheduled ? (
                <button
                  type="button"
                  onClick={() => onComplete(quest)}
                  className="rounded-full border border-emerald-500/50 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
                >
                  Log
                </button>
              ) : (
                <span className="rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1.5 text-xs text-slate-500">—</span>
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenuId(menuOpen ? null : quest.id)}
                  aria-label="More options"
                  className="flex h-8 w-6 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-800/60 hover:text-white"
                >
                  <KebabIcon />
                </button>

                {menuOpen ? (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                    <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuId(null);
                          onEdit(quest);
                        }}
                        className="block w-full px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-slate-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuId(null);
                          onToggleStatus(quest);
                        }}
                        className="block w-full px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-slate-800"
                      >
                        {quest.status === "active" ? "Archive" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuId(null);
                          onDelete(quest.id);
                        }}
                        className="block w-full px-3 py-2 text-left text-xs text-rose-300 transition hover:bg-rose-500/10"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
