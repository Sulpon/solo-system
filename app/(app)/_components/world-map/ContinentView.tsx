"use client";

import { getContinent } from "../../_lib/world-map/continents";
import { getCountriesForContinent } from "../../_lib/world-map/countries";
import { getCountryProgress, getCountryState, getContinentProgress } from "../../_lib/engines/world-map-engine";
import { getStateVisuals } from "./world-map-visuals";
import type { GoalTree } from "../../_lib/types/goal-tree";
import type { CharacterPosition } from "../../_lib/engines/world-map-engine";

type ContinentViewProps = Readonly<{
  continentId: string;
  goalTree: GoalTree;
  characterPosition: CharacterPosition | null;
  onBack: () => void;
  onSelectCountry: (countryId: string) => void;
}>;

export default function ContinentView({ continentId, goalTree, characterPosition, onBack, onSelectCountry }: ContinentViewProps) {
  const continent = getContinent(continentId);
  const countries = getCountriesForContinent(continentId);

  if (!continent) {
    return null;
  }

  const continentProgress = getContinentProgress(continentId, goalTree);

  return (
    <div className="rounded-2xl border border-purple-500/25 bg-[radial-gradient(circle_at_50%_10%,rgba(88,28,135,0.16),transparent_55%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(8,6,20,0.98))] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-purple-400/60 hover:text-white">
            ‹
          </button>
          <div>
            <p className="flex items-center gap-2 text-lg font-black text-white">
              <span>{continent.icon}</span> {continent.name}
            </p>
            <p className="text-xs text-slate-500">{continent.domainLabel} · {continentProgress}% explored</p>
          </div>
        </div>
      </div>

      {countries.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center text-sm text-slate-500">
          {continent.description}
          <br />
          No countries charted here yet.
        </div>
      ) : (
        <div className="relative mt-4 aspect-[4/3] w-full">
          {countries.map((country) => {
            const progress = getCountryProgress(country.id, goalTree);
            const state = getCountryState(progress);
            const visuals = getStateVisuals(state);
            const isCharacterHere = characterPosition?.countryId === country.id;

            return (
              <button
                key={country.id}
                type="button"
                onClick={() => onSelectCountry(country.id)}
                style={{ left: `${(country.position.x / 400) * 100}%`, top: `${(country.position.y / 300) * 100}%` }}
                className="group absolute -translate-x-1/2 -translate-y-1/2"
              >
                <span
                  className={`flex flex-col items-center gap-0.5 rounded-lg border px-2.5 py-1.5 backdrop-blur-sm transition group-hover:scale-105 ${visuals.border} ${visuals.bg} ${visuals.glow} ${visuals.fogClass}`}
                >
                  <span className="text-base">{country.flag}</span>
                  <span className="whitespace-nowrap text-[10px] font-bold text-white">{country.name}</span>
                  <span className={`text-[9px] font-semibold ${visuals.text}`}>{progress}%</span>
                </span>
                {isCharacterHere ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-base" title="You are here" aria-label="Character position">
                    🧍
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
