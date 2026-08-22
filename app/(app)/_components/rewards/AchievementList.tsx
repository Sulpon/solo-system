import { ACHIEVEMENT_DEFINITIONS } from "../../_lib/achievements/achievement-definitions";
import Progress from "../Progress";
import RewardGrid from "./RewardGrid";
import type { QuestCompletion } from "../../_lib/types/quest";
import type { UnlockedReward } from "../../_lib/types/reward";

type AchievementListProps = Readonly<{
  rewardCollection: ReadonlyArray<UnlockedReward>;
  questCompletions: ReadonlyArray<QuestCompletion>;
}>;

export default function AchievementList({ rewardCollection, questCompletions }: AchievementListProps) {
  const unlockedIds = new Set(rewardCollection.map((entry) => entry.id));
  const dynamicAchievements = rewardCollection.filter(
    (entry) => entry.sourceType === "achievement" && (entry.id.startsWith("achievement:goal:") || entry.id.startsWith("achievement:pr:")),
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Milestone Achievements</p>
        <div className="space-y-3">
          {ACHIEVEMENT_DEFINITIONS.map((definition) => {
            const rewardId = `achievement:${definition.id}`;
            const unlocked = unlockedIds.has(rewardId);
            const liveValue = definition.compute({ questCompletions });
            const progress = Math.min(100, Math.round((liveValue / definition.target) * 100));

            return (
              <div key={definition.id} className={`rounded-xl border p-4 ${unlocked ? "border-purple-400/40 bg-purple-400/5" : "border-slate-800 bg-slate-950/40"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={`text-sm font-bold ${unlocked ? "text-purple-200" : "text-white"}`}>{definition.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{definition.description}</p>
                  </div>
                  {unlocked ? <span className="shrink-0 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">Unlocked</span> : null}
                </div>
                <div className="mt-3">
                  <Progress value={liveValue} max={definition.target} className="h-2 overflow-hidden rounded-full bg-slate-900" fillClassName="h-full bg-gradient-to-r from-purple-500 to-cyan-400" />
                  <p className="mt-1 text-[11px] text-slate-500">
                    {Math.min(liveValue, definition.target).toLocaleString()} / {definition.target.toLocaleString()} {definition.unit} ({progress}%)
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Goal &amp; Personal-Record Achievements</p>
        <RewardGrid rewards={dynamicAchievements} emptyText="Completing a Goal Tree node or hitting a new Workout personal record unlocks an achievement here." />
      </div>
    </div>
  );
}
