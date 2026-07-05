import type { Achievement } from "../_lib/types";
import Card from "./Card";
import Progress from "./Progress";

type AchievementCardProps = Readonly<{
  achievement: Achievement;
}>;

export default function AchievementCard({ achievement }: AchievementCardProps) {
  return (
    <Card className="border-purple-500/30 bg-slate-900/75 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Recent Achievement</p>
      <div className="mt-5 rounded-xl border border-slate-700/80 bg-slate-950/45 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">{achievement.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{achievement.description}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-purple-300">+{achievement.xpReward}</p>
            <p className="text-xs text-slate-500">XP</p>
          </div>
        </div>
        <Progress
          value={achievement.progress}
          max={achievement.target}
          className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950/80"
          fillClassName="h-full bg-purple-500"
        />
      </div>
    </Card>
  );
}
