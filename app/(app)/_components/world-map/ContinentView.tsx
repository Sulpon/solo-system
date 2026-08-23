"use client";

import { getContinent } from "../../_lib/world-map/continents";
import { getCountriesForContinent } from "../../_lib/world-map/countries";
import { getContinentProgress } from "../../_lib/engines/world-map-engine";
import WorldMapCanvas from "./WorldMapCanvas";
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
    <div className="rounded-2xl border border-purple-500/25 bg-slate-950/40 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-purple-400/60 hover:text-white">
            ‹
          </button>
          <div>
            <p className="flex items-center gap-2 text-lg font-black text-white">
              <span>{continent.icon}</span> {continent.name}
            </p>
            <p className="text-xs text-slate-500">
              {continent.domainLabel} · {continentProgress}% explored
            </p>
          </div>
        </div>
        <p className="text-[11px] text-slate-500">Click a country to open its territory report</p>
      </div>

      {countries.length === 0 ? (
        <div className="mt-2 rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center text-sm text-slate-500">
          {continent.description}
          <br />
          No countries charted here yet.
        </div>
      ) : (
        <WorldMapCanvas goalTree={goalTree} characterPosition={characterPosition} continentId={continentId} onSelectCountry={onSelectCountry} />
      )}
    </div>
  );
}
