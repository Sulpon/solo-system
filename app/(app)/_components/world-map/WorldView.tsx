"use client";

import WorldMapCanvas from "./WorldMapCanvas";
import type { GoalTree } from "../../_lib/types/goal-tree";
import type { CharacterPosition } from "../../_lib/engines/world-map-engine";
import type { RivalState } from "../../_lib/types/rival";

type WorldViewProps = Readonly<{
  goalTree: GoalTree;
  characterPosition: CharacterPosition | null;
  rivalStates: Readonly<Record<string, RivalState>>;
  onSelectContinent: (continentId: string) => void;
  onSelectCountry: (countryId: string) => void;
}>;

export default function WorldView({ goalTree, characterPosition, rivalStates, onSelectContinent, onSelectCountry }: WorldViewProps) {
  return (
    <div className="rounded-2xl border border-purple-500/25 bg-slate-950/40 p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">Global View</p>
        <p className="text-[11px] text-slate-500">Click a continent to zoom in</p>
      </div>
      <WorldMapCanvas
        goalTree={goalTree}
        characterPosition={characterPosition}
        rivalStates={rivalStates}
        continentId={null}
        onSelectContinent={onSelectContinent}
        onSelectCountry={onSelectCountry}
      />
    </div>
  );
}
