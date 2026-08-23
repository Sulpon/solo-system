"use client";

import { useState } from "react";
import { getCountry, getCountryFlagEmoji } from "../../_lib/world-map/countries";
import { getContinent } from "../../_lib/world-map/continents";
import { getCitiesForCountry } from "../../_lib/world-map/cities";
import { getDungeonsForCity } from "../../_lib/world-map/dungeons";
import {
  getCountryDisplayState,
  getCountryStateLabel,
  getCountryOwnership,
  getCountryConquestStatus,
  getLinkedGoals,
  getLinkableGoalCandidates,
  getLinkedGoalsForCity,
  getLinkableGoalCandidatesForCity,
  getGoalRouteCheckpoints,
  getCityProgress,
  getCityState,
  getDungeonStatus,
  isCityConquered,
  type WorldMapDungeonProgress,
} from "../../_lib/engines/world-map-engine";
import { getStateVisuals } from "./world-map-visuals";
import DungeonCard from "./DungeonCard";
import type { GoalTree } from "../../_lib/types/goal-tree";
import type { RivalState } from "../../_lib/types/rival";

type CountryDetailPanelProps = Readonly<{
  countryId: string;
  goalTree: GoalTree;
  selectedGoalId: string | null;
  rivalStates: Readonly<Record<string, RivalState>>;
  playerCountryId: string | null;
  dungeonProgress: WorldMapDungeonProgress;
  onClose: () => void;
  onLinkGoal: (goalId: string, countryId: string) => void;
  onUnlinkGoal: (goalId: string) => void;
  onLinkGoalToCity: (goalId: string, cityId: string) => void;
  onUnlinkGoalFromCity: (goalId: string) => void;
  onSelectActiveGoal: (goalId: string) => void;
  onSelectRival: (rivalId: string) => void;
  onCompleteDungeon: (dungeonId: string) => void;
}>;

export default function CountryDetailPanel({
  countryId,
  goalTree,
  selectedGoalId,
  rivalStates,
  playerCountryId,
  dungeonProgress,
  onClose,
  onLinkGoal,
  onUnlinkGoal,
  onLinkGoalToCity,
  onUnlinkGoalFromCity,
  onSelectActiveGoal,
  onSelectRival,
  onCompleteDungeon,
}: CountryDetailPanelProps) {
  const [pickerValue, setPickerValue] = useState("");
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [selectedDungeonId, setSelectedDungeonId] = useState<string | null>(null);
  const [cityGoalPickerValue, setCityGoalPickerValue] = useState("");

  const country = getCountry(countryId);
  const continent = country ? getContinent(country.continentId) : null;

  if (!country || !continent) {
    return null;
  }

  const ownership = getCountryOwnership(country.id, goalTree, rivalStates);
  const state = getCountryDisplayState(country.id, goalTree, rivalStates);
  const visuals = getStateVisuals(state);
  const linkedGoals = getLinkedGoals(country.id, goalTree);
  const linkableGoals = getLinkableGoalCandidates(goalTree);
  const cities = getCitiesForCountry(country.id);
  const conquestStatus = getCountryConquestStatus(country, dungeonProgress);
  const isEncounter = playerCountryId === country.id && ownership.rivals.length > 0;

  const selectedCity = selectedCityId ? cities.find((city) => city.id === selectedCityId) : null;
  const selectedDungeon = selectedCity && selectedDungeonId ? getDungeonsForCity(selectedCity.id).find((dungeon) => dungeon.id === selectedDungeonId) : null;

  function handleLink() {
    if (pickerValue) {
      onLinkGoal(pickerValue, country!.id);
      setPickerValue("");
    }
  }

  function handleLinkCity(cityId: string) {
    if (cityGoalPickerValue) {
      onLinkGoalToCity(cityGoalPickerValue, cityId);
      setCityGoalPickerValue("");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className="max-h-[88vh] w-full overflow-y-auto rounded-t-2xl border border-purple-500/30 bg-slate-950 p-5 shadow-[0_0_55px_rgba(124,58,237,0.28)] sm:max-w-2xl sm:rounded-2xl"
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">{getCountryFlagEmoji(country.iso2)}</span>
          <div>
            <h2 className="text-xl font-black text-white">{country.name}</h2>
            <p className="text-xs text-slate-500">
              {continent.icon} {continent.name} · {country.domain}
            </p>
          </div>
          <span className={`ml-auto rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] ${visuals.border} ${visuals.bg} ${visuals.text}`}>{getCountryStateLabel(state)}</span>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-3 py-1 text-sm text-slate-300 transition hover:border-purple-400/60 hover:text-white">
            Close
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-400">{country.description}</p>

        {isEncounter ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-400/60 bg-rose-400/15 px-3 py-2 text-xs font-semibold text-rose-200">
            <span>⚔️</span>
            <span>Rival encounter - you and {ownership.rivals.length === 1 ? ownership.rivals[0].name : `${ownership.rivals.length} rivals`} are both here.</span>
          </div>
        ) : ownership.isContested ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-rose-400/50 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
            <span>⚔️</span>
            <span>Contested territory - more than one party has meaningful progress here.</span>
          </div>
        ) : null}

        {conquestStatus.isConquered ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200">
            <span>🏆</span>
            <span>Country Conquered - every city here has fallen.</span>
          </div>
        ) : null}

        {/* Territory ownership - player + every rival with real progress in
            this country (section 26: additive, never destroying history). */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Your Territory Progress</span>
            <span className={`font-semibold ${visuals.text}`}>{ownership.playerProgress}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-900">
            <div className="h-full rounded-full transition-all" style={{ width: `${ownership.playerProgress}%`, backgroundColor: "#c084fc" }} />
          </div>

          {ownership.rivals.map((rival) => (
            <button key={rival.rivalId} type="button" onClick={() => onSelectRival(rival.rivalId)} className="block w-full text-left">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="hover:text-rose-300 hover:underline">
                  {rival.name}
                  {rival.conquered ? " (Conquered)" : ""}
                </span>
                <span className="font-semibold text-rose-300">{Math.round(rival.progress)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-900">
                <div className="h-full rounded-full bg-rose-400/70" style={{ width: `${rival.progress}%` }} />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-purple-300">Related Goals</p>

            {linkedGoals.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No Goal linked to this country yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {linkedGoals.map((goal) => (
                  <li key={goal.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <button type="button" onClick={() => onSelectActiveGoal(goal.id)} className={"truncate text-left text-sm font-semibold hover:underline " + (selectedGoalId === goal.id ? "text-purple-200" : "text-white")}>
                        {goal.title}
                      </button>
                      <button type="button" onClick={() => onUnlinkGoal(goal.id)} className="shrink-0 text-xs text-rose-300 hover:text-rose-200">
                        Unlink
                      </button>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-900">
                        <div className="h-full rounded-full bg-purple-400" style={{ width: `${Math.max(0, Math.min(100, goal.progress ?? 0))}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-500">{Math.max(0, Math.min(100, goal.progress ?? 0))}%</span>
                    </div>
                    {selectedGoalId === goal.id ? <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-purple-300">Active on map</p> : null}
                  </li>
                ))}
              </ul>
            )}

            {linkableGoals.length > 0 ? (
              <div className="mt-3 flex gap-2">
                <select value={pickerValue} onChange={(event) => setPickerValue(event.target.value)} className="flex-1 rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1.5 text-xs text-white outline-none focus:border-purple-400">
                  <option value="">Link an existing Goal...</option>
                  {linkableGoals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.title}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={handleLink} disabled={!pickerValue} className="rounded-lg border border-purple-400/50 bg-purple-500/15 px-3 py-1.5 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-40">
                  Link
                </button>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-purple-300">Route</p>
            {linkedGoals.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Link a Goal to see its milestone route here.</p>
            ) : (
              <div className="mt-3 space-y-4">
                {linkedGoals.map((goal) => {
                  const checkpoints = getGoalRouteCheckpoints(goal);
                  return (
                    <div key={goal.id}>
                      <p className="truncate text-xs font-semibold text-slate-300">{goal.title}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {checkpoints.map((checkpoint, index) => (
                          <div key={checkpoint.id} className="flex items-center gap-1.5">
                            <span
                              className={
                                "flex h-6 items-center rounded-full border px-2 text-[10px] font-semibold " +
                                (checkpoint.completed ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200" : "border-slate-700 bg-slate-900 text-slate-500")
                              }
                              title={checkpoint.title}
                            >
                              {checkpoint.completed ? "✓" : "○"} {checkpoint.title}
                            </span>
                            {index < checkpoints.length - 1 ? <span className="text-slate-700">→</span> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cities - the country's own control points. Each has its own
            independent progress and its own Dungeon/Boss ladder (never a
            shared country-wide ladder). */}
        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-purple-300">Cities</p>
            <p className="text-[10px] text-slate-500">{conquestStatus.conqueredCityIds.length} / {conquestStatus.totalCityIds} conquered</p>
          </div>

          <div className="mt-2 space-y-2">
            {cities.map((city) => {
              const progress = getCityProgress(city.id, goalTree);
              const cityState = getCityState(city.id, progress, dungeonProgress);
              const cityVisuals = getStateVisuals(cityState);
              const isSelected = selectedCityId === city.id;

              return (
                <div key={city.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedCityId(isSelected ? null : city.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${isSelected ? "border-purple-400/60 bg-purple-500/10" : "border-slate-800 bg-slate-950/60 hover:border-slate-700"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{city.name}</p>
                      <p className="truncate text-[11px] text-slate-500">{city.cityAspect}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${cityVisuals.border} ${cityVisuals.bg} ${cityVisuals.text}`}>
                      {cityState === "conquered" ? "Conquered" : `${progress}%`}
                    </span>
                  </button>

                  {isSelected ? (
                    <CityDungeonLadder
                      cityId={city.id}
                      cityName={city.name}
                      progress={progress}
                      dungeonProgress={dungeonProgress}
                      goalTree={goalTree}
                      onSelectDungeon={setSelectedDungeonId}
                      linkedGoals={getLinkedGoalsForCity(city.id, goalTree)}
                      linkableGoals={getLinkableGoalCandidatesForCity(country.id, goalTree)}
                      cityGoalPickerValue={cityGoalPickerValue}
                      onCityGoalPickerChange={setCityGoalPickerValue}
                      onLinkCity={() => handleLinkCity(city.id)}
                      onUnlinkFromCity={onUnlinkGoalFromCity}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedDungeon && selectedCity ? (
        <DungeonCard
          dungeon={selectedDungeon}
          city={selectedCity}
          country={country}
          status={getDungeonStatus(selectedDungeon, getCityProgress(selectedCity.id, goalTree), dungeonProgress, goalTree)}
          goalTree={goalTree}
          onClose={() => setSelectedDungeonId(null)}
          onComplete={() => {
            onCompleteDungeon(selectedDungeon.id);
            setSelectedDungeonId(null);
          }}
        />
      ) : null}
    </div>
  );
}

type CityDungeonLadderProps = Readonly<{
  cityId: string;
  cityName: string;
  progress: number;
  dungeonProgress: WorldMapDungeonProgress;
  goalTree: GoalTree;
  onSelectDungeon: (dungeonId: string) => void;
  linkedGoals: GoalTree;
  linkableGoals: GoalTree;
  cityGoalPickerValue: string;
  onCityGoalPickerChange: (value: string) => void;
  onLinkCity: () => void;
  onUnlinkFromCity: (goalId: string) => void;
}>;

function CityDungeonLadder({
  cityId,
  cityName,
  progress,
  dungeonProgress,
  goalTree,
  onSelectDungeon,
  linkedGoals,
  linkableGoals,
  cityGoalPickerValue,
  onCityGoalPickerChange,
  onLinkCity,
  onUnlinkFromCity,
}: CityDungeonLadderProps) {
  const dungeons = getDungeonsForCity(cityId);
  const conquered = isCityConquered(cityId, dungeonProgress);

  return (
    <div className="ml-2 mt-1 space-y-3 border-l border-slate-800 pl-4">
      <div>
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span>{cityName} Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-900">
          <div className="h-full rounded-full bg-purple-400" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {dungeons.map((dungeon) => {
          const status = getDungeonStatus(dungeon, progress, dungeonProgress, goalTree);
          const icon = status === "completed" ? (dungeon.isBoss ? "👑" : "✓") : status === "available" ? (dungeon.isBoss ? "⚔️" : "🔓") : "🔒";
          return (
            <button
              key={dungeon.id}
              type="button"
              onClick={() => onSelectDungeon(dungeon.id)}
              className={
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition " +
                (status === "completed"
                  ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
                  : status === "available"
                    ? dungeon.isBoss
                      ? "border-rose-400/60 bg-rose-400/15 text-rose-200 animate-pulse"
                      : "border-amber-400/50 bg-amber-400/10 text-amber-200"
                    : "border-slate-700 bg-slate-900 text-slate-500")
              }
            >
              {icon} {dungeon.isBoss ? "Boss" : `Dungeon ${dungeon.dungeonNumber}`}
            </button>
          );
        })}
      </div>

      {conquered ? <p className="text-[11px] font-semibold text-amber-300">🏙️ {cityName} Conquered</p> : null}

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-purple-300">Goals for {cityName}</p>
        {linkedGoals.length === 0 ? (
          <p className="mt-1 text-xs text-slate-500">No Goal linked to this city yet.</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {linkedGoals.map((goal) => (
              <li key={goal.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-slate-300">{goal.title}</span>
                <button type="button" onClick={() => onUnlinkFromCity(goal.id)} className="shrink-0 text-rose-300 hover:text-rose-200">
                  Unlink
                </button>
              </li>
            ))}
          </ul>
        )}

        {linkableGoals.length > 0 ? (
          <div className="mt-2 flex gap-2">
            <select
              value={cityGoalPickerValue}
              onChange={(event) => onCityGoalPickerChange(event.target.value)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1 text-[11px] text-white outline-none focus:border-purple-400"
            >
              <option value="">Refine with a country-linked Goal...</option>
              {linkableGoals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onLinkCity}
              disabled={!cityGoalPickerValue}
              className="rounded-lg border border-purple-400/50 bg-purple-500/15 px-2.5 py-1 text-[11px] font-semibold text-purple-100 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Link
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
