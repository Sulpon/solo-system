"use client";

import { useState } from "react";
import Card from "../Card";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { useWorldMapState } from "../../_lib/hooks/useWorldMapState";
import { useProgression } from "../../_lib/hooks/useProgression";
import { getRankLabel } from "../../_lib/engines/level-engine";
import { getCharacterPosition, getWorldStatistics } from "../../_lib/engines/world-map-engine";
import WorldView from "./WorldView";
import ContinentView from "./ContinentView";
import CountryDetailPanel from "./CountryDetailPanel";
import LeaderboardView from "./LeaderboardView";

type MapViewLevel = "world" | "continent";
type PageTab = "map" | "leaderboard";

export default function WorldMapPageClient() {
  const { goalTree, hasLoaded, saveNode } = useGoalTree();
  const { selectedGoalId, setSelectedGoalId, hasLoaded: worldMapStateLoaded } = useWorldMapState();
  const { isReady: progressionReady, progressionSummary } = useProgression();
  const [tab, setTab] = useState<PageTab>("map");
  const [viewLevel, setViewLevel] = useState<MapViewLevel>("world");
  const [selectedContinentId, setSelectedContinentId] = useState<string | null>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);

  if (!hasLoaded || !worldMapStateLoaded || !progressionReady) {
    return (
      <Card className="p-5">
        <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4 text-sm text-slate-400">Loading World Map...</div>
      </Card>
    );
  }

  const characterPosition = getCharacterPosition(goalTree, selectedGoalId);
  const stats = getWorldStatistics(goalTree);
  const rank = getRankLabel(progressionSummary.currentLevel);

  function goToContinent(continentId: string) {
    setSelectedContinentId(continentId);
    setViewLevel("continent");
  }

  function linkGoal(goalId: string, countryId: string) {
    saveNode(goalId, (current) => ({ ...current, worldMapLocationId: countryId }));
  }

  function unlinkGoal(goalId: string) {
    saveNode(goalId, (current) => ({ ...current, worldMapLocationId: undefined }));
    if (selectedGoalId === goalId) {
      setSelectedGoalId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-purple-500/25 bg-[radial-gradient(circle_at_12%_0%,rgba(126,34,206,0.18),transparent_24%),linear-gradient(135deg,rgba(15,23,42,0.7),rgba(2,6,23,0.9))] p-5">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/60 to-transparent" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">World Map</p>
            <h1 className="mt-1 text-2xl font-black text-white">Your life, as a world</h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab("map")}
              className={"rounded-xl border px-4 py-2 text-sm font-semibold transition " + (tab === "map" ? "border-purple-400/60 bg-purple-500/20 text-white" : "border-slate-700 bg-slate-950/50 text-slate-400 hover:text-white")}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => setTab("leaderboard")}
              className={"rounded-xl border px-4 py-2 text-sm font-semibold transition " + (tab === "leaderboard" ? "border-purple-400/60 bg-purple-500/20 text-white" : "border-slate-700 bg-slate-950/50 text-slate-400 hover:text-white")}
            >
              Leaderboard
            </button>
          </div>
        </div>

        {/* Compact RPG HUD - Level/Rank/XP reuse the existing global
            progression, never a separate World Map XP source. */}
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-purple-400/40 bg-purple-500/10 text-lg font-black text-purple-200">{rank}</span>
            <div>
              <p className="text-sm font-bold text-white">Lv {progressionSummary.currentLevel}</p>
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500">Global Rank</p>
            </div>
          </div>

          <div className="min-w-[140px] flex-1">
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>XP</span>
              <span>{progressionSummary.xpInCurrentLevel} / {progressionSummary.xpNeededForNextLevel}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-900">
              <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400" style={{ width: `${progressionSummary.progress}%` }} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300">
              <span className="font-black text-amber-300">{stats.countriesConquered}</span> Countries Conquered
            </span>
            <span className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300">
              <span className="font-black text-rose-300">{stats.bossesDefeated}</span> Bosses Defeated
            </span>
            <span className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300">
              <span className="font-black text-cyan-300">{stats.worldProgressPercent}%</span> World Progress
            </span>
          </div>
        </div>
      </Card>

      {tab === "leaderboard" ? (
        <LeaderboardView />
      ) : (
        <>
          {characterPosition ? (
            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="animate-pulse">🧍</span>
                  <span className="text-slate-400">Active journey:</span>
                  <span className="font-semibold text-white">{characterPosition.goalTitle}</span>
                  {characterPosition.checkpointTitle ? (
                    <span className="text-slate-500">
                      · Last milestone: <span className="text-emerald-300">{characterPosition.checkpointTitle}</span>
                    </span>
                  ) : null}
                </div>
                <span className="text-xs text-slate-500">
                  {characterPosition.checkpointIndex + 1} / {characterPosition.totalCheckpoints} checkpoints
                </span>
              </div>
            </Card>
          ) : null}

          {viewLevel === "world" ? (
            <WorldView goalTree={goalTree} characterPosition={characterPosition} onSelectContinent={goToContinent} onSelectCountry={setSelectedCountryId} />
          ) : null}

          {viewLevel === "continent" && selectedContinentId ? (
            <ContinentView
              continentId={selectedContinentId}
              goalTree={goalTree}
              characterPosition={characterPosition}
              onBack={() => setViewLevel("world")}
              onSelectCountry={setSelectedCountryId}
            />
          ) : null}

          {selectedCountryId ? (
            <CountryDetailPanel
              countryId={selectedCountryId}
              goalTree={goalTree}
              selectedGoalId={selectedGoalId}
              onClose={() => setSelectedCountryId(null)}
              onLinkGoal={linkGoal}
              onUnlinkGoal={unlinkGoal}
              onSelectActiveGoal={setSelectedGoalId}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
