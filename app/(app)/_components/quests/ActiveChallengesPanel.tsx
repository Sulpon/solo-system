"use client";

import Link from "next/link";
import Card from "../Card";
import { useChallenges } from "../../_lib/hooks/useChallenges";
import { useChallengeMetrics } from "../../_lib/hooks/useChallengeMetrics";
import { useChallengeEntries } from "../../_lib/hooks/useChallengeEntries";
import { getChallengeDayNumber } from "../../_lib/engines/challenge-mission-engine";
import { getLocalDayKey } from "../../_lib/local-day";
import type { Challenge, ChallengeEntry, ChallengeMetric } from "../../_lib/types/challenge";
import type { Quest } from "../../_lib/types/quest";

type ActiveChallengesPanelProps = Readonly<{
  quests: ReadonlyArray<Quest>;
}>;

function isLoggedToday(metric: ChallengeMetric, entries: ReadonlyArray<ChallengeEntry>, todayKey: string): boolean {
  const entry = entries.find((item) => item.metricId === metric.id && item.date === todayKey);
  if (!entry) return false;
  // A boolean metric stores 1 for done; anything else present counts as
  // logged for its own type.
  return metric.type === "boolean" ? Number(entry.value) === 1 : entry.value !== undefined || entry.photoId !== undefined;
}

function ChallengeRow({ challenge, metrics, entries, questTitleById, todayKey }: Readonly<{
  challenge: Challenge;
  metrics: ReadonlyArray<ChallengeMetric>;
  entries: ReadonlyArray<ChallengeEntry>;
  questTitleById: Map<string, string>;
  todayKey: string;
}>) {
  const required = metrics.filter((metric) => metric.required);
  const doneToday = required.filter((metric) => isLoggedToday(metric, entries, todayKey)).length;
  const allDone = required.length > 0 && doneToday === required.length;
  const dayNumber = getChallengeDayNumber(challenge);

  return (
    <Link
      href={`/challenges/${challenge.id}`}
      className="block rounded-xl border border-slate-800 bg-slate-950/50 p-3 transition hover:border-purple-400/40 hover:bg-slate-900/60"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-sm">{challenge.icon}</span>
          <span className="truncate text-sm font-semibold text-white">{challenge.title}</span>
        </div>
        <span className="shrink-0 text-xs text-slate-500">
          Day {dayNumber} of {challenge.durationDays}
        </span>
      </div>

      {required.length > 0 ? (
        <p className={"mt-1.5 text-xs " + (allDone ? "text-emerald-300" : "text-slate-400")}>
          {allDone ? "Logged for today" : `${doneToday} of ${required.length} logged today`}
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-slate-500">No required metrics.</p>
      )}

      {/* Which Quests feed this challenge, so the connection is visible from
          the page where those Quests are completed. */}
      {metrics.some((metric) => metric.linkedQuestId) ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {metrics
            .filter((metric) => metric.linkedQuestId)
            .map((metric) => (
              <span key={metric.id} className="rounded-md border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 text-[11px] text-cyan-200">
                {questTitleById.get(metric.linkedQuestId as string) ?? "Linked Quest"}
              </span>
            ))}
        </div>
      ) : null}
    </Link>
  );
}

// Active Challenges, surfaced on the Quests page.
//
// Read-only: this is a view over the same Challenge records the Challenges
// page owns, never a second place to edit them. Logging still happens
// either on the Challenge itself or by completing a linked Quest on this
// very page (see engines/challenge-quest-sync.ts).
export default function ActiveChallengesPanel({ quests }: ActiveChallengesPanelProps) {
  const { challenges, hasLoaded: challengesLoaded } = useChallenges();
  const { metrics, hasLoaded: metricsLoaded } = useChallengeMetrics();
  const { entries, hasLoaded: entriesLoaded } = useChallengeEntries();

  if (!challengesLoaded || !metricsLoaded || !entriesLoaded) {
    return null;
  }

  const active = challenges.filter((challenge) => challenge.status === "active");

  // Nothing to show rather than an empty shell - the Quests page is busy
  // enough without a permanent placeholder.
  if (active.length === 0) {
    return null;
  }

  const todayKey = getLocalDayKey();
  const questTitleById = new Map(quests.map((quest) => [quest.id, quest.title]));

  return (
    <Card className="p-5" testId="active-challenges">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">Challenges</p>
          <h2 className="mt-1 text-sm font-black uppercase tracking-[0.14em] text-white">Running today</h2>
        </div>
        <Link href="/challenges" className="text-xs text-slate-400 transition hover:text-white">
          All Challenges →
        </Link>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {active.map((challenge) => (
          <ChallengeRow
            key={challenge.id}
            challenge={challenge}
            metrics={metrics.filter((metric) => metric.challengeId === challenge.id).sort((a, b) => a.position - b.position)}
            entries={entries.filter((entry) => entry.challengeId === challenge.id)}
            questTitleById={questTitleById}
            todayKey={todayKey}
          />
        ))}
      </div>
    </Card>
  );
}
