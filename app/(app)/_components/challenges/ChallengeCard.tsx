"use client";

import Link from "next/link";
import Progress from "../Progress";
import { getChallengeDayNumber, getTimeProgressPercent } from "../../_lib/engines/challenge-mission-engine";
import type { Challenge } from "../../_lib/types/challenge";

const STATUS_LABELS: Record<Challenge["status"], string> = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
  abandoned: "Abandoned",
};

const STATUS_CLASSES: Record<Challenge["status"], string> = {
  draft: "border-slate-700 text-slate-400",
  active: "border-cyan-400/40 bg-cyan-400/10 text-cyan-200",
  completed: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  abandoned: "border-rose-400/30 bg-rose-400/10 text-rose-300",
};

export default function ChallengeCard({ challenge }: Readonly<{ challenge: Challenge }>) {
  const dayNumber = challenge.status === "active" ? getChallengeDayNumber(challenge) : null;
  const progressPercent = challenge.status === "active" ? getTimeProgressPercent(challenge) : challenge.status === "completed" ? 100 : 0;

  return (
    <Link
      href={`/challenges/${challenge.id}`}
      className="block rounded-2xl border border-slate-800 bg-slate-950/55 p-5 transition hover:border-purple-500/40 hover:bg-slate-900/70"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/70 text-lg">{challenge.icon}</span>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-white">{challenge.title}</p>
            {challenge.description ? <p className="mt-1 line-clamp-2 text-sm text-slate-400">{challenge.description}</p> : null}
          </div>
        </div>
        <span className={"shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] " + STATUS_CLASSES[challenge.status]}>{STATUS_LABELS[challenge.status]}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-purple-200">{challenge.category}</span>
        {(challenge.tags ?? []).slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-full border border-slate-800 bg-slate-950/60 px-2.5 py-1 text-[10px] text-slate-400">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{dayNumber !== null ? `Day ${dayNumber} of ${challenge.durationDays}` : `${challenge.durationDays} days`}</span>
          <span>{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="mt-2 h-2 overflow-hidden rounded-full bg-slate-950/80" fillClassName="h-full bg-gradient-to-r from-purple-500 to-cyan-300" />
      </div>
    </Link>
  );
}
