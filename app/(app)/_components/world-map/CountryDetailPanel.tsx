"use client";

import { useState } from "react";
import { getCountry } from "../../_lib/world-map/countries";
import { getContinent } from "../../_lib/world-map/continents";
import { getBossForCountry } from "../../_lib/world-map/bosses";
import { getDungeonsForCountry } from "../../_lib/world-map/dungeons";
import {
  getCountryProgress,
  getCountryDisplayState,
  getCountryStateLabel,
  isCountryContested,
  getLinkedGoals,
  getLinkableGoalCandidates,
  getGoalRouteCheckpoints,
} from "../../_lib/engines/world-map-engine";
import { getRivalsTargetingCountry } from "../../_lib/world-map/rivals";
import { getStateVisuals } from "./world-map-visuals";
import type { GoalTree } from "../../_lib/types/goal-tree";

type CountryDetailPanelProps = Readonly<{
  countryId: string;
  goalTree: GoalTree;
  selectedGoalId: string | null;
  onClose: () => void;
  onLinkGoal: (goalId: string, countryId: string) => void;
  onUnlinkGoal: (goalId: string) => void;
  onSelectActiveGoal: (goalId: string) => void;
}>;

export default function CountryDetailPanel({ countryId, goalTree, selectedGoalId, onClose, onLinkGoal, onUnlinkGoal, onSelectActiveGoal }: CountryDetailPanelProps) {
  const [pickerValue, setPickerValue] = useState("");
  const country = getCountry(countryId);
  const continent = country ? getContinent(country.continentId) : null;

  if (!country || !continent) {
    return null;
  }

  const progress = getCountryProgress(country.id, goalTree);
  const state = getCountryDisplayState(country.id, goalTree);
  const contested = isCountryContested(country.id, goalTree);
  const visuals = getStateVisuals(state);
  const linkedGoals = getLinkedGoals(country.id, goalTree);
  const linkableGoals = getLinkableGoalCandidates(goalTree);
  const boss = getBossForCountry(country.id);
  const dungeons = getDungeonsForCountry(country.id);
  const rivalHere = getRivalsTargetingCountry(country.id)[0] ?? null;

  function handleLink() {
    if (pickerValue) {
      onLinkGoal(pickerValue, country!.id);
      setPickerValue("");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className="max-h-[88vh] w-full overflow-y-auto rounded-t-2xl border border-purple-500/30 bg-slate-950 p-5 shadow-[0_0_55px_rgba(124,58,237,0.28)] sm:max-w-2xl sm:rounded-2xl"
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">{country.flag}</span>
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

        {contested && rivalHere ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-rose-400/50 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
            <span>⚔️</span>
            <span>
              Contested territory - <span className="font-semibold text-white">{rivalHere.name}</span> ({rivalHere.title}) is active here too.
            </span>
          </div>
        ) : null}

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Territory Progress</span>
            <span className={`font-semibold ${visuals.text}`}>{progress}%</span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-900">
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: visuals.ring }} />
          </div>
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

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Dungeons</p>
            <p className="mt-1 text-sm text-slate-400">
              0 / {dungeons.length} discovered - locked until the Dungeon system unlocks.
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {dungeons.map((dungeon) => (
                <li key={dungeon.id} className="rounded-full border border-slate-700 bg-slate-950/60 px-2 py-1 text-[10px] font-semibold text-slate-500" title={dungeon.name}>
                  🔒 {dungeon.name}
                </li>
              ))}
            </ul>
          </div>
          {boss ? (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-300">Boss</p>
              <p className="mt-2 text-sm font-bold text-white">{boss.name}</p>
              <p className="mt-1 text-xs text-slate-500">{boss.description}</p>
              <span className="mt-2 inline-block rounded-full border border-slate-700 bg-slate-950/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Locked</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
