"use client";

import Card from "../Card";
import Progress from "../Progress";
import { getChallengeDayNumber, getRequiredMetricAdherencePercent, getTimeProgressPercent } from "../../_lib/engines/challenge-mission-engine";
import type { Challenge, ChallengeEntry, ChallengeMetric } from "../../_lib/types/challenge";

const STATUS_LABELS: Record<Challenge["status"], string> = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
  abandoned: "Abandoned",
};

type ChallengeOverviewHeaderProps = Readonly<{
  challenge: Challenge;
  metrics: ReadonlyArray<ChallengeMetric>;
  entries: ReadonlyArray<ChallengeEntry>;
  onStart: () => void;
  onAbandon: () => void;
}>;

export default function ChallengeOverviewHeader({ challenge, metrics, entries, onStart, onAbandon }: ChallengeOverviewHeaderProps) {
  const dayNumber = challenge.status === "draft" ? null : getChallengeDayNumber(challenge);
  const timeProgress = challenge.status === "draft" ? 0 : challenge.status === "completed" ? 100 : getTimeProgressPercent(challenge);
  const adherencePercent = challenge.status === "draft" ? null : getRequiredMetricAdherencePercent(challenge, metrics, entries);

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/10 text-2xl">{challenge.icon}</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">{STATUS_LABELS[challenge.status]}</p>
            <h1 className="mt-1 text-2xl font-black text-white">{challenge.title}</h1>
            {challenge.description ? <p className="mt-2 max-w-2xl text-sm text-slate-400">{challenge.description}</p> : null}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-purple-200">{challenge.category}</span>
              {(challenge.tags ?? []).map((tag) => (
                <span key={tag} className="rounded-full border border-slate-800 bg-slate-950/60 px-2.5 py-1 text-[10px] text-slate-400">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {challenge.status === "draft" ? (
          <button type="button" onClick={onStart} className="shrink-0 rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
            Start Challenge
          </button>
        ) : null}

        {challenge.status === "active" ? (
          <button type="button" onClick={onAbandon} className="shrink-0 rounded-xl border border-rose-400/30 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10">
            Abandon
          </button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Day</p>
          <p className="mt-1 text-xl font-black text-white">{dayNumber !== null ? `${dayNumber} / ${challenge.durationDays}` : `${challenge.durationDays} days`}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Start Date</p>
          <p className="mt-1 text-xl font-black text-white">{challenge.startDate}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">End Date</p>
          <p className="mt-1 text-xl font-black text-white">{challenge.endDate}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Completion</p>
          <p className="mt-1 text-xl font-black text-white">{adherencePercent !== null ? `${adherencePercent}%` : "—"}</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Time Progress</span>
          <span>{timeProgress}%</span>
        </div>
        <Progress value={timeProgress} className="mt-2 h-3 overflow-hidden rounded-full bg-slate-950/80" fillClassName="h-full bg-gradient-to-r from-purple-500 to-cyan-300" />
      </div>
    </Card>
  );
}
