"use client";

import { useState } from "react";
import Card from "../Card";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { useWorldMapState } from "../../_lib/hooks/useWorldMapState";
import { useWorldMapDungeons } from "../../_lib/hooks/useWorldMapDungeons";
import { useProgression } from "../../_lib/hooks/useProgression";
import { useCelebration } from "../../_lib/hooks/useCelebration";
import { useRivalWorld } from "../../_lib/hooks/useRivalWorld";
import { getRankLabel } from "../../_lib/engines/level-engine";
import { getCharacterPosition, getWorldStatistics, getRivalDistance, getCountryConquestStatus, isCityConquered } from "../../_lib/engines/world-map-engine";
import { getRivalIdentity } from "../../_lib/world-map/rival-roster";
import { getDungeon } from "../../_lib/world-map/dungeons";
import { getCountry } from "../../_lib/world-map/countries";
import { getCity } from "../../_lib/world-map/cities";
import WorldView from "./WorldView";
import ContinentView from "./ContinentView";
import CountryDetailPanel from "./CountryDetailPanel";
import RivalProfilePanel from "./RivalProfilePanel";
import LeaderboardView from "./LeaderboardView";

type MapViewLevel = "world" | "continent";
type PageTab = "map" | "leaderboard";

export default function WorldMapPageClient() {
  const { goalTree, hasLoaded, saveNode } = useGoalTree();
  const { selectedGoalId, setSelectedGoalId, hasLoaded: worldMapStateLoaded } = useWorldMapState();
  const { dungeonProgress, completeDungeon, hasLoaded: dungeonsLoaded } = useWorldMapDungeons();
  const { isReady: progressionReady, progressionSummary, addBonusXpEvents } = useProgression();
  const { enqueueCelebration } = useCelebration();
  const [tab, setTab] = useState<PageTab>("map");
  const [viewLevel, setViewLevel] = useState<MapViewLevel>("world");
  const [selectedContinentId, setSelectedContinentId] = useState<string | null>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [selectedRivalId, setSelectedRivalId] = useState<string | null>(null);

  const characterPosition = hasLoaded && worldMapStateLoaded ? getCharacterPosition(goalTree, selectedGoalId) : null;
  const { statesById: rivalStates, hasLoaded: rivalWorldLoaded } = useRivalWorld(characterPosition?.countryId ?? null, progressionSummary.currentLevel);

  if (!hasLoaded || !worldMapStateLoaded || !progressionReady || !rivalWorldLoaded || !dungeonsLoaded) {
    return (
      <Card className="p-5">
        <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4 text-sm text-slate-400">Loading World Map...</div>
      </Card>
    );
  }

  const stats = getWorldStatistics(goalTree, dungeonProgress);
  const rank = getRankLabel(progressionSummary.currentLevel);

  const nearbyRivals = Object.values(rivalStates)
    .map((state) => ({ state, distance: getRivalDistance(characterPosition?.countryId ?? null, state.currentCountryId) }))
    .filter((entry) => entry.distance !== null && entry.distance <= 1)
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

  function goToContinent(continentId: string) {
    setSelectedContinentId(continentId);
    setViewLevel("continent");
  }

  function linkGoal(goalId: string, countryId: string) {
    saveNode(goalId, (current) => ({ ...current, worldMapLocationId: countryId }));
  }

  function unlinkGoal(goalId: string) {
    saveNode(goalId, (current) => ({ ...current, worldMapLocationId: undefined, worldMapCityId: undefined }));
    if (selectedGoalId === goalId) {
      setSelectedGoalId(null);
    }
  }

  function linkGoalToCity(goalId: string, cityId: string) {
    saveNode(goalId, (current) => ({ ...current, worldMapCityId: cityId }));
  }

  function unlinkGoalFromCity(goalId: string) {
    saveNode(goalId, (current) => ({ ...current, worldMapCityId: undefined }));
  }

  // Reward + celebration only - the dungeon completion itself is persisted
  // by useWorldMapDungeons. Reuses the existing bonus-XP-event pipeline
  // (the same one Challenges/Mystery Rewards use) and the existing
  // celebration queue - never a parallel XP or notification system.
  function handleCompleteDungeon(dungeonId: string) {
    const dungeon = getDungeon(dungeonId);
    if (!dungeon) return;

    const city = getCity(dungeon.cityId);
    const country = getCountry(dungeon.countryId);
    const nowIso = new Date().toISOString();

    completeDungeon(dungeonId, nowIso);

    if (dungeon.xpReward > 0) {
      addBonusXpEvents([
        {
          id: `world-map-dungeon-${dungeon.id}`,
          sourceType: "world_map",
          sourceId: dungeon.id,
          sourceTitle: dungeon.name,
          amount: dungeon.xpReward,
          attributeXp: [],
          createdAt: nowIso,
        },
      ]);
    }

    const nextDungeonProgress = { ...dungeonProgress, [dungeonId]: nowIso };

    if (!dungeon.isBoss) {
      enqueueCelebration({
        kind: "dungeon_completed",
        intensity: "small",
        title: "Dungeon Completed",
        description: `${dungeon.name}${city ? ` - ${city.name}` : ""}`,
        xpGained: dungeon.xpReward,
      });
      return;
    }

    enqueueCelebration({
      kind: "boss_defeated",
      intensity: "major",
      title: "Boss Defeated",
      description: dungeon.name,
      xpGained: dungeon.xpReward,
    });

    if (city) {
      enqueueCelebration({
        kind: "city_conquered",
        intensity: "major",
        title: "City Conquered",
        description: `🏙️ ${city.name}${country ? `, ${country.name}` : ""}`,
      });
    }

    if (country && isCityConquered(dungeon.cityId, nextDungeonProgress)) {
      const conquestStatus = getCountryConquestStatus(country, nextDungeonProgress);
      if (conquestStatus.isConquered) {
        enqueueCelebration({
          kind: "country_conquered",
          intensity: "legendary",
          title: "Country Conquered",
          description: `🏆 ${country.name}`,
        });
      }
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
              <span className="font-black text-rose-300">{stats.citiesConquered}</span> Cities Conquered
            </span>
            <span className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300">
              <span className="font-black text-cyan-300">{stats.worldProgressPercent}%</span> World Progress
            </span>
          </div>
        </div>
      </Card>

      {tab === "leaderboard" ? (
        <LeaderboardView rivalStates={rivalStates} dungeonProgress={dungeonProgress} onSelectRival={setSelectedRivalId} />
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

              {nearbyRivals.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-800 pt-2">
                  {nearbyRivals.map(({ state, distance }) => {
                    const identity = getRivalIdentity(state.identityId);
                    if (!identity) return null;
                    return (
                      <button
                        key={state.identityId}
                        type="button"
                        onClick={() => setSelectedRivalId(state.identityId)}
                        className="rounded-full border border-rose-400/40 bg-rose-400/10 px-3 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/20"
                      >
                        {distance === 0 ? "⚔️" : "⚠️"} {identity.name} {distance === 0 ? "- encounter" : "- 1 country away"}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </Card>
          ) : null}

          {viewLevel === "world" ? (
            <WorldView goalTree={goalTree} characterPosition={characterPosition} rivalStates={rivalStates} onSelectContinent={goToContinent} onSelectCountry={setSelectedCountryId} />
          ) : null}

          {viewLevel === "continent" && selectedContinentId ? (
            <ContinentView
              continentId={selectedContinentId}
              goalTree={goalTree}
              characterPosition={characterPosition}
              rivalStates={rivalStates}
              onBack={() => setViewLevel("world")}
              onSelectCountry={setSelectedCountryId}
              onSelectRival={setSelectedRivalId}
            />
          ) : null}

          {selectedCountryId ? (
            <CountryDetailPanel
              countryId={selectedCountryId}
              goalTree={goalTree}
              selectedGoalId={selectedGoalId}
              rivalStates={rivalStates}
              playerCountryId={characterPosition?.countryId ?? null}
              dungeonProgress={dungeonProgress}
              onClose={() => setSelectedCountryId(null)}
              onLinkGoal={linkGoal}
              onUnlinkGoal={unlinkGoal}
              onLinkGoalToCity={linkGoalToCity}
              onUnlinkGoalFromCity={unlinkGoalFromCity}
              onSelectActiveGoal={setSelectedGoalId}
              onSelectRival={setSelectedRivalId}
              onCompleteDungeon={handleCompleteDungeon}
            />
          ) : null}
        </>
      )}

      {selectedRivalId ? (
        <RivalProfilePanel
          rivalId={selectedRivalId}
          rivalState={rivalStates[selectedRivalId] ?? null}
          playerCountryId={characterPosition?.countryId ?? null}
          onClose={() => setSelectedRivalId(null)}
        />
      ) : null}
    </div>
  );
}
