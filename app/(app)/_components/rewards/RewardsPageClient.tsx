"use client";

import { useState } from "react";
import Card from "../Card";
import { useProgression } from "../../_lib/hooks/useProgression";
import { useRewardCollection } from "../../_lib/hooks/useRewardCollection";
import AchievementList from "./AchievementList";
import RealLifeRewardManager from "./RealLifeRewardManager";
import RewardGrid from "./RewardGrid";
import type { RewardType } from "../../_lib/types/reward";

const TABS = [
  { id: "all", label: "All" },
  { id: "badge", label: "Badges" },
  { id: "title", label: "Titles" },
  { id: "mystery", label: "Mystery Rewards" },
  { id: "theme", label: "Themes" },
  { id: "achievements", label: "Achievements" },
  { id: "real-life", label: "Real-Life Rewards" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function RewardsPageClient() {
  const { questDefinitions, questCompletions, isReady } = useProgression();
  const { rewardCollection, hasLoaded } = useRewardCollection();
  const [activeTab, setActiveTab] = useState<TabId>("all");

  const byType = (type: RewardType) => rewardCollection.filter((entry) => entry.reward.type === type);
  const mysteryRewards = rewardCollection.filter((entry) => entry.sourceType === "mystery_reward");

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-purple-500/25 bg-[radial-gradient(circle_at_12%_0%,rgba(126,34,206,0.18),transparent_24%),linear-gradient(135deg,rgba(15,23,42,0.7),rgba(2,6,23,0.9))] p-5">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/60 to-transparent" />
        <h1 className="text-xl font-black uppercase tracking-[0.08em] text-purple-300">Reward Collection</h1>
        <p className="mt-1 text-sm text-slate-400">Badges, titles, Mystery Rewards, achievements, and real-life rewards earned along the way.</p>
        <p className="mt-3 text-sm text-slate-500">{rewardCollection.length} unlocked so far</p>
      </Card>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={
              "rounded-xl border px-4 py-2 text-sm font-semibold transition " +
              (activeTab === tab.id
                ? "border-purple-500/50 bg-purple-500/15 text-white"
                : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-white")
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card className="p-5">
        {!hasLoaded || !isReady ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : activeTab === "all" ? (
          <RewardGrid rewards={rewardCollection} emptyText="Nothing unlocked yet - complete quests, hit streak milestones, and level up to start collecting." />
        ) : activeTab === "badge" ? (
          <RewardGrid rewards={byType("badge")} emptyText="No badges unlocked yet." />
        ) : activeTab === "title" ? (
          <RewardGrid rewards={byType("title")} emptyText="No titles unlocked yet." />
        ) : activeTab === "mystery" ? (
          <RewardGrid rewards={mysteryRewards} emptyText="Mystery Rewards roll automatically every 10-day streak milestone and at major character levels." />
        ) : activeTab === "theme" ? (
          <RewardGrid rewards={byType("theme")} emptyText="No themes unlocked yet." />
        ) : activeTab === "achievements" ? (
          <AchievementList rewardCollection={rewardCollection} questCompletions={questCompletions} />
        ) : (
          <RealLifeRewardManager quests={questDefinitions} questCompletions={questCompletions} />
        )}
      </Card>
    </div>
  );
}
