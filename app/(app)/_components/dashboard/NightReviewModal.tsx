"use client";

import { useState } from "react";
import Modal from "../Modal";
import { useAttributes } from "../../_lib/hooks/useAttributes";
import type { DailySnapshot } from "../../_lib/types/daily-system";

type NightReviewModalProps = Readonly<{
  snapshot: DailySnapshot;
  alreadyReviewed: boolean;
  onClose: () => void;
  onFinish: (reflectionNote?: string) => void;
}>;

export default function NightReviewModal({ snapshot, alreadyReviewed, onClose, onFinish }: NightReviewModalProps) {
  const { attributes: categories } = useAttributes();
  const [reflectionNote, setReflectionNote] = useState(snapshot.reflectionNote ?? "");

  function getAttributeName(id: string) {
    return categories.find((category) => category.id === id)?.name ?? id;
  }

  return (
    <Modal title="Daily Review" onClose={onClose}>
      <div className="space-y-5">
        {alreadyReviewed ? (
          <div className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 p-4 text-sm text-cyan-100">
            Today already has a review snapshot. Finishing again will update today&apos;s review with the latest progress.
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Core Quests</p>
            <p className="mt-2 text-2xl font-black text-white">
              {snapshot.completedCoreQuestIds.length} / {snapshot.coreQuestIds.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Bonus Quests</p>
            <p className="mt-2 text-2xl font-black text-white">
              {snapshot.completedBonusQuestIds.length} / {snapshot.bonusQuestIds.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Quest XP Today</p>
            <p className="mt-2 text-2xl font-black text-white">{snapshot.questXpEarned.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Daily Success</p>
            <p className="mt-2 text-2xl font-black text-white">{snapshot.dailySuccessPercent}%</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Attribute XP</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {snapshot.attributeXpEarned.length > 0 ? (
              snapshot.attributeXpEarned.map((reward) => (
                <span key={reward.attributeId} className="rounded-full border border-purple-400/25 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-100">
                  {getAttributeName(reward.attributeId)} +{reward.amount}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">No attribute XP earned yet today.</span>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Progress Goal Updates</p>
            <p className="mt-2 text-2xl font-black text-white">{snapshot.progressGoalUpdates.length}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Goal XP Events</p>
            <p className="mt-2 text-2xl font-black text-white">{snapshot.completedGoalNodeIds.length}</p>
          </div>
        </div>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">What are you proud of today? (optional)</span>
          <textarea
            value={reflectionNote}
            onChange={(event) => setReflectionNote(event.target.value)}
            placeholder="A sentence is enough."
            className="w-full min-h-20 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400"
          />
        </label>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
            Close
          </button>
          <button type="button" onClick={() => onFinish(reflectionNote)} className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
            End Day
          </button>
        </div>
      </div>
    </Modal>
  );
}
