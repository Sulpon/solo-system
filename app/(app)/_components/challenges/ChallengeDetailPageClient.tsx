"use client";

import { useRouter } from "next/navigation";
import Card from "../Card";
import { useChallenge } from "../../_lib/hooks/useChallenge";
import ChallengeOverviewHeader from "./ChallengeOverviewHeader";
import ChallengeTracker from "./ChallengeTracker";
import ChallengeAnalytics from "./ChallengeAnalytics";
import ChallengeReview from "./ChallengeReview";

export default function ChallengeDetailPageClient({ challengeId }: Readonly<{ challengeId: string }>) {
  const router = useRouter();
  const { hasLoaded, challenge, metrics, entries, startChallenge, abandonChallenge, saveReview, deleteChallenge, setEntryValue, setEntryPhoto } = useChallenge(challengeId);

  if (!hasLoaded) {
    return (
      <Card className="p-5">
        <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4 text-sm text-slate-400">Loading Challenge...</div>
      </Card>
    );
  }

  if (!challenge) {
    return (
      <Card className="p-8">
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center text-sm text-slate-400">Challenge not found.</div>
      </Card>
    );
  }

  async function handleDelete() {
    if (!challenge) return;
    if (!window.confirm(`Delete "${challenge.title}" and all its logged data? This cannot be undone.`)) return;
    await deleteChallenge(challenge.id);
    router.push("/challenges");
  }

  const showTracker = challenge.status !== "draft";
  const showReview = challenge.status === "completed" || challenge.status === "abandoned";

  return (
    <div className="space-y-5">
      <ChallengeOverviewHeader challenge={challenge} metrics={metrics} entries={entries} onStart={() => startChallenge(challenge.id)} onAbandon={() => abandonChallenge(challenge.id)} />

      {!showTracker ? (
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Daily Metrics</p>
          <div className="mt-3 space-y-2">
            {metrics.map((metric) => (
              <div key={metric.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-300">
                <span className="font-semibold text-white">{metric.name}</span>
                <span className="text-xs text-slate-500">
                  {metric.type}
                  {metric.target !== undefined ? ` · target ${metric.target}${metric.unit ? ` ${metric.unit}` : ""}` : ""}
                  {metric.required ? "" : " · optional"}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">This challenge hasn't started yet - press Start Challenge above to begin logging.</p>
        </Card>
      ) : null}

      {showTracker ? (
        <Card className="p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Daily Tracker</p>
          <ChallengeTracker challenge={challenge} metrics={metrics} entries={entries} onSetValue={setEntryValue} onSetPhoto={setEntryPhoto} />
        </Card>
      ) : null}

      {showTracker && !showReview ? (
        <Card className="p-5">
          <ChallengeAnalytics challenge={challenge} metrics={metrics} entries={entries} />
        </Card>
      ) : null}

      {showReview ? (
        <Card className="p-5">
          <ChallengeReview challenge={challenge} metrics={metrics} entries={entries} onSaveReview={(review) => saveReview(challenge.id, review)} />
        </Card>
      ) : null}

      <div className="flex justify-end">
        <button type="button" onClick={handleDelete} className="text-xs text-rose-400/80 hover:text-rose-300">
          Delete Challenge
        </button>
      </div>
    </div>
  );
}
