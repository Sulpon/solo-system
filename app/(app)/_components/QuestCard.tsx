import type { DailyQuest, QuestCompletion } from "../_lib/types";
import { calculateQuestConsistency } from "../_lib/daily-system";
import { deriveChallengeProgress } from "../_lib/engines/challenge-engine";
import { getConsistencyTier } from "../_lib/engines/quest-visual-engine";
import FocusButton from "./focus/FocusButton";
import ChallengeStreakDots from "./quests/ChallengeStreakDots";
import QuestIcon, { getQuestIconKey } from "./quests/QuestIcon";

type QuestCardProps = Readonly<{
  quest: DailyQuest;
  completed: boolean;
  onToggle: (id: string) => void;
  questCompletions?: ReadonlyArray<QuestCompletion>;
}>;

export default function QuestCard({ quest, completed, onToggle, questCompletions = [] }: QuestCardProps) {
  const challengeProgress = quest.challenge?.enabled && quest.createdAt ? deriveChallengeProgress(quest, questCompletions) : null;
  const tier = getConsistencyTier(calculateQuestConsistency(quest, questCompletions));
  const iconKey = getQuestIconKey(quest.title);

  return (
    <label
      className={
        "group flex min-h-32 cursor-pointer flex-col justify-between rounded-xl border p-4 transition duration-200 " +
        (completed
          ? "border-purple-400/60 bg-purple-500/15 shadow-[0_0_28px_rgba(168,85,247,0.2)]"
          : `${tier.borderClass} bg-slate-950/45 hover:border-purple-500/40 hover:bg-slate-900/80 ${tier.glowClass}`)
      }
    >
      <span className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-start gap-2">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${tier.borderClass} ${tier.bgClass} ${tier.textClass}`}>
            <QuestIcon iconKey={iconKey} className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className={"block truncate text-sm font-semibold " + (completed ? "text-purple-100" : "text-white")}>{quest.title}</span>
            </span>
            <span className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${tier.textClass}`}>{tier.label}</span>
            <span className="mt-1 block truncate text-xs leading-5 text-slate-500 group-hover:text-slate-400">{quest.description}</span>
          </span>
        </span>
        {!completed ? (
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions
          <span onClick={(event) => event.preventDefault()}>
            <FocusButton quest={{ id: quest.id, title: quest.title, linkedProgressGoalId: quest.linkedProgressGoalId }} compact />
          </span>
        ) : null}
      </span>

      {challengeProgress && quest.challenge ? (
        <span className="mt-2 flex items-center gap-2 text-[10px] leading-none text-slate-400">
          <span className="font-semibold text-white">
            {challengeProgress.todayValue} / {challengeProgress.todayTarget}
          </span>
          <ChallengeStreakDots current={challengeProgress.currentStreak} required={quest.challenge.requiredStreak} />
          <span>
            Lv {challengeProgress.currentLevelIndex + 1}/{quest.challenge.levels.length}
          </span>
        </span>
      ) : null}

      <span className="mt-5 flex items-center justify-between text-sm">
        <input type="checkbox" checked={completed} onChange={() => onToggle(quest.id)} className="accent-purple-500" />
        <span className={completed ? "text-emerald-300" : "text-purple-300"}>+{quest.xp} XP</span>
      </span>
    </label>
  );
}
