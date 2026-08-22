"use client";

import { useState } from "react";
import { calculateQuestStreak } from "../../_lib/daily-system";
import { useRealLifeRewards } from "../../_lib/hooks/useRealLifeRewards";
import type { Quest, QuestCompletion } from "../../_lib/types/quest";

type RealLifeRewardManagerProps = Readonly<{
  quests: ReadonlyArray<Quest>;
  questCompletions: ReadonlyArray<QuestCompletion>;
}>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500";

export default function RealLifeRewardManager({ quests, questCompletions }: RealLifeRewardManagerProps) {
  const { rewards, addReward, deleteReward, setRedeemed } = useRealLifeRewards();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [milestone, setMilestone] = useState("");
  const [description, setDescription] = useState("");
  const [linkedQuestId, setLinkedQuestId] = useState("");
  const [streakThreshold, setStreakThreshold] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");

  function resetForm() {
    setTitle("");
    setMilestone("");
    setDescription("");
    setLinkedQuestId("");
    setStreakThreshold("");
    setEstimatedValue("");
    setShowForm(false);
  }

  function handleSubmit() {
    if (!title.trim() || !milestone.trim()) {
      return;
    }

    addReward({
      title: title.trim(),
      milestone: milestone.trim(),
      description: description.trim() || undefined,
      linkedQuestId: linkedQuestId || null,
      streakThreshold: streakThreshold ? Math.max(1, Math.floor(Number(streakThreshold) || 1)) : undefined,
      estimatedValue: estimatedValue ? Math.max(0, Number(estimatedValue) || 0) : undefined,
    });
    resetForm();
  }

  function isUnlocked(linkedQuestId: string | null | undefined, streakThreshold: number | undefined) {
    if (!linkedQuestId || !streakThreshold) {
      return null;
    }

    const quest = quests.find((item) => item.id === linkedQuestId);
    if (!quest) {
      return null;
    }

    return calculateQuestStreak(quest, questCompletions) >= streakThreshold;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Your Reward Pool</p>
        <button
          type="button"
          onClick={() => setShowForm((current) => !current)}
          className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
        >
          {showForm ? "Cancel" : "+ Add Reward"}
        </button>
      </div>

      {showForm ? (
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className={labelClass}>Title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nice dinner" className={inputClass} />
            </label>
            <label className="space-y-2">
              <span className={labelClass}>Milestone</span>
              <input value={milestone} onChange={(event) => setMilestone(event.target.value)} placeholder="30-day streak" className={inputClass} />
            </label>
          </div>
          <label className="block space-y-2">
            <span className={labelClass}>Description (optional)</span>
            <input value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-2">
              <span className={labelClass}>Linked Quest (optional)</span>
              <select value={linkedQuestId} onChange={(event) => setLinkedQuestId(event.target.value)} className={inputClass}>
                <option value="">None</option>
                {quests.map((quest) => (
                  <option key={quest.id} value={quest.id}>
                    {quest.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className={labelClass}>Streak Threshold (days)</span>
              <input type="number" min={1} value={streakThreshold} onChange={(event) => setStreakThreshold(event.target.value)} className={inputClass} />
            </label>
            <label className="space-y-2">
              <span className={labelClass}>Estimated Value ($, optional)</span>
              <input type="number" min={0} value={estimatedValue} onChange={(event) => setEstimatedValue(event.target.value)} className={inputClass} />
            </label>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={handleSubmit} className="rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/25">
              Save Reward
            </button>
          </div>
        </div>
      ) : null}

      {rewards.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-center text-sm text-slate-500">
          Define your own real-life rewards for major milestones - nothing here is auto-invented.
        </p>
      ) : (
        <div className="space-y-2">
          {rewards.map((reward) => {
            const unlocked = isUnlocked(reward.linkedQuestId, reward.streakThreshold);

            return (
              <div key={reward.id} className={"flex items-center justify-between gap-4 rounded-xl border p-4 " + (reward.redeemed ? "border-emerald-500/30 bg-emerald-500/5" : "border-slate-800 bg-slate-950/40")}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-white">{reward.title}</p>
                    {reward.redeemed ? <span className="shrink-0 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">Redeemed</span> : null}
                    {!reward.redeemed && unlocked ? <span className="shrink-0 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">Ready</span> : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {reward.milestone}
                    {reward.description ? ` - ${reward.description}` : ""}
                    {reward.estimatedValue ? ` - ~$${reward.estimatedValue.toLocaleString()}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRedeemed(reward.id, !reward.redeemed)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-purple-400/60 hover:text-white"
                  >
                    {reward.redeemed ? "Mark Unredeemed" : "Mark Redeemed"}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteReward(reward.id)}
                    className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs text-rose-300 transition hover:bg-rose-500/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
