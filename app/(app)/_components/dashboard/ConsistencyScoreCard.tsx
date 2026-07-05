"use client";

import Card from "../Card";
import Progress from "../Progress";

type ConsistencyScoreCardProps = Readonly<{
  score: number | null;
  todayPercent: number;
  reviewedDays: number;
}>;

export default function ConsistencyScoreCard({ score, todayPercent, reviewedDays }: ConsistencyScoreCardProps) {
  const displayScore = score ?? todayPercent;

  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">Consistency</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-4xl font-black text-white">{displayScore}%</p>
          <p className="mt-2 text-sm text-slate-400">
            {score === null ? "Current day only. Finish days to build history." : `Average across ${reviewedDays} reviewed day${reviewedDays === 1 ? "" : "s"}.`}
          </p>
        </div>
      </div>
      <Progress
        value={displayScore}
        max={100}
        className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-950/80"
        fillClassName="h-full bg-gradient-to-r from-amber-400 via-purple-400 to-cyan-300"
      />
    </Card>
  );
}
