"use client";

import { useState } from "react";
import Card from "../Card";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { useWorldMapState } from "../../_lib/hooks/useWorldMapState";
import { getCharacterPosition } from "../../_lib/engines/world-map-engine";
import WorldView from "./WorldView";
import ContinentView from "./ContinentView";
import CountryView from "./CountryView";
import WorldMapStatsBar from "./WorldMapStatsBar";
import LeaderboardView from "./LeaderboardView";

type MapViewLevel = "world" | "continent" | "country";
type PageTab = "map" | "leaderboard";

export default function WorldMapPageClient() {
  const { goalTree, hasLoaded, saveNode } = useGoalTree();
  const { selectedGoalId, setSelectedGoalId, hasLoaded: worldMapStateLoaded } = useWorldMapState();
  const [tab, setTab] = useState<PageTab>("map");
  const [viewLevel, setViewLevel] = useState<MapViewLevel>("world");
  const [selectedContinentId, setSelectedContinentId] = useState<string | null>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);

  if (!hasLoaded || !worldMapStateLoaded) {
    return (
      <Card className="p-5">
        <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4 text-sm text-slate-400">Loading World Map...</div>
      </Card>
    );
  }

  const characterPosition = getCharacterPosition(goalTree, selectedGoalId);

  function goToContinent(continentId: string) {
    setSelectedContinentId(continentId);
    setViewLevel("continent");
  }

  function goToCountry(countryId: string) {
    setSelectedCountryId(countryId);
    setViewLevel("country");
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
        <div className="mt-4">
          <WorldMapStatsBar goalTree={goalTree} />
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
                  <span>🧍</span>
                  <span className="text-slate-400">Current destination:</span>
                  <span className="font-semibold text-white">{characterPosition.goalTitle}</span>
                  {characterPosition.checkpointTitle ? (
                    <span className="text-slate-500">
                      · Next milestone reached: <span className="text-emerald-300">{characterPosition.checkpointTitle}</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </Card>
          ) : null}

          {viewLevel === "world" ? <WorldView goalTree={goalTree} characterPosition={characterPosition} onSelectContinent={goToContinent} /> : null}

          {viewLevel === "continent" && selectedContinentId ? (
            <ContinentView
              continentId={selectedContinentId}
              goalTree={goalTree}
              characterPosition={characterPosition}
              onBack={() => setViewLevel("world")}
              onSelectCountry={goToCountry}
            />
          ) : null}

          {viewLevel === "country" && selectedCountryId ? (
            <CountryView
              countryId={selectedCountryId}
              goalTree={goalTree}
              selectedGoalId={selectedGoalId}
              onBack={() => setViewLevel(selectedContinentId ? "continent" : "world")}
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
