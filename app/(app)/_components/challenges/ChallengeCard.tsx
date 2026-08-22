"use client";

import Link from "next/link";
import Card from "../Card";
import Progress from "../Progress";
import StreakDots from "./StreakDots";
import { getCurrentLevel } from "../../_lib/engines/challenge-engine";
import type { Challenge } from "../../_lib/types/challenge";

type ChallengeCardProps = Readonly<{ challenge: Challenge; todayValue: number }>;

export default function ChallengeCard({ challenge, todayValue }: ChallengeCardProps) {
  const level = getCurrentLevel(challenge);
  const target = level?.target ?? 0;
  const progressPercent = target > 0 ? Math.min(100, Math.round((todayValue / target) * 100)) : 0;
  const metToday = target > 0 && todayValue >= target;

  return (
    <Link href={`/challenges/${challenge.id}`} className="block h-full">
      <Card className={"flex h-full flex-col p-5 transition " + (metToday ? "border-emerald-500/40" : "")}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-black text-white">{challenge.title}</h2>
          <span className="shrink-0 text-slate-500">→</span>
        </div>

        <p className="mt-2 text-sm text-slate-400">
          {todayValue} / {target} {challenge.unit}
        </p>
        <Progress
          value={progressPercent}
          max={100}
          className="mt-3 h-2 overflow-hidden rounded-full bg-slate-900"
          fillClassName={"h-full bg-gradient-to-r " + (metToday ? "from-emerald-500 to-cyan-400" : "from-purple-500 to-cyan-400")}
        />

        <div className="mt-4 flex flex-1 items-end justify-between gap-3">
          <StreakDots current={challenge.currentStreak} required={challenge.requiredStreak} />
          <span className="shrink-0 rounded-lg border border-slate-700 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Level: {target} {challenge.unit}
          </span>
        </div>
      </Card>
    </Link>
  );
}
