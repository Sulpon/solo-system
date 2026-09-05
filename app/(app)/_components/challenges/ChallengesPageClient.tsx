"use client";

import { useState } from "react";
import Card from "../Card";
import { useChallenges } from "../../_lib/hooks/useChallenges";
import { useChallengeMetrics } from "../../_lib/hooks/useChallengeMetrics";
import ChallengeCard from "./ChallengeCard";
import ChallengeForm from "./ChallengeForm";
import type { Challenge } from "../../_lib/types/challenge";

type FilterTab = "active" | "draft" | "completed" | "abandoned" | "all";

const FILTER_TABS: ReadonlyArray<{ id: FilterTab; label: string }> = [
  { id: "active", label: "Active" },
  { id: "draft", label: "Draft" },
  { id: "completed", label: "Completed" },
  { id: "abandoned", label: "Abandoned" },
  { id: "all", label: "All" },
];

function matchesFilter(challenge: Challenge, tab: FilterTab) {
  return tab === "all" || challenge.status === tab;
}

export default function ChallengesPageClient() {
  const { challenges, createChallenge, hasLoaded: challengesLoaded } = useChallenges();
  const { addMetric, hasLoaded: metricsLoaded } = useChallengeMetrics();
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<FilterTab>("active");

  if (!challengesLoaded || !metricsLoaded) {
    return (
      <Card className="p-5">
        <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4 text-sm text-slate-400">Loading Challenges...</div>
      </Card>
    );
  }

  const visibleChallenges = challenges.filter((challenge) => matchesFilter(challenge, tab)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  function handleSave(challengeDraft: Parameters<typeof createChallenge>[0], metricDrafts: ReadonlyArray<Omit<Parameters<typeof addMetric>[0], "challengeId">>, startNow: boolean) {
    const challenge = createChallenge(challengeDraft, startNow ? "active" : "draft");
    metricDrafts.forEach((metricDraft) => addMetric({ ...metricDraft, challengeId: challenge.id }));
    setShowForm(false);
    setTab(startNow ? "active" : "draft");
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Challenges</p>
            <h1 className="mt-1 text-xl font-black text-white">Temporary missions with a beginning, middle, and end</h1>
          </div>
          {!showForm ? (
            <button type="button" onClick={() => setShowForm(true)} className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
              + Add Challenge
            </button>
          ) : null}
        </div>
      </Card>

      {showForm ? <ChallengeForm onSave={handleSave} onCancel={() => setShowForm(false)} /> : null}

      <Card className="p-5">
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={
                "rounded-xl border px-4 py-2 text-sm font-semibold transition " +
                (tab === entry.id ? "border-purple-400/60 bg-purple-500/15 text-white" : "border-slate-700 text-slate-400 hover:border-purple-500/40 hover:text-white")
              }
            >
              {entry.label}
            </button>
          ))}
        </div>
      </Card>

      {visibleChallenges.length === 0 ? (
        <Card className="p-8">
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center text-sm text-slate-400">
            No {tab === "all" ? "" : tab} challenges yet.
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleChallenges.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </div>
      )}
    </div>
  );
}
