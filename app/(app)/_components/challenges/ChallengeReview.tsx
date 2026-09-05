"use client";

import { useState } from "react";
import { useDocumentPhotoUrl } from "../../_lib/hooks/useDocumentPhotoUrl";
import { getBestFullAdherenceStreak, getRequiredMetricAdherencePercent } from "../../_lib/engines/challenge-mission-engine";
import ChallengeAnalytics from "./ChallengeAnalytics";
import type { Challenge, ChallengeEntry, ChallengeMetric } from "../../_lib/types/challenge";

const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";
const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-purple-400";

function PhotoThumb({ photoId }: Readonly<{ photoId: string }>) {
  const url = useDocumentPhotoUrl(photoId);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="aspect-square w-full rounded-lg object-cover" />
  ) : (
    <div className="aspect-square w-full rounded-lg bg-slate-900" />
  );
}

type ChallengeReviewProps = Readonly<{
  challenge: Challenge;
  metrics: ReadonlyArray<ChallengeMetric>;
  entries: ReadonlyArray<ChallengeEntry>;
  onSaveReview: (review: { whatChanged?: string; whatLearned?: string }) => void;
}>;

export default function ChallengeReview({ challenge, metrics, entries, onSaveReview }: ChallengeReviewProps) {
  const [whatChanged, setWhatChanged] = useState(challenge.review?.whatChanged ?? "");
  const [whatLearned, setWhatLearned] = useState(challenge.review?.whatLearned ?? "");

  const adherencePercent = getRequiredMetricAdherencePercent(challenge, metrics, entries);
  const bestStreak = getBestFullAdherenceStreak(challenge, metrics, entries);
  const photoEntries = entries.filter((entry) => entry.photoId);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">{challenge.status === "completed" ? "Challenge Complete" : "Challenge Review"}</p>
        <h2 className="mt-1 text-xl font-black text-white">{challenge.title}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className={labelClass}>Completion</p>
            <p className="mt-1 text-2xl font-black text-white">{adherencePercent !== null ? `${adherencePercent}%` : "—"}</p>
          </div>
          <div>
            <p className={labelClass}>Best Streak</p>
            <p className="mt-1 text-2xl font-black text-white">{bestStreak} days</p>
          </div>
          <div>
            <p className={labelClass}>Duration</p>
            <p className="mt-1 text-2xl font-black text-white">{challenge.durationDays} days</p>
          </div>
        </div>
      </div>

      <ChallengeAnalytics challenge={challenge} metrics={metrics} entries={entries} />

      {photoEntries.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Photos</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {photoEntries.map((entry) => (
              <PhotoThumb key={entry.id} photoId={entry.photoId as string} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Reflection</p>
        <label className="block space-y-1.5">
          <span className={labelClass}>What changed?</span>
          <textarea value={whatChanged} onChange={(event) => setWhatChanged(event.target.value)} rows={3} className={inputClass} placeholder="What's different now compared to when you started?" />
        </label>
        <label className="block space-y-1.5">
          <span className={labelClass}>What did you learn?</span>
          <textarea value={whatLearned} onChange={(event) => setWhatLearned(event.target.value)} rows={3} className={inputClass} placeholder="What would you do differently next time?" />
        </label>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onSaveReview({ whatChanged: whatChanged.trim() || undefined, whatLearned: whatLearned.trim() || undefined })}
            className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
          >
            Save Reflection
          </button>
        </div>
      </div>
    </div>
  );
}
