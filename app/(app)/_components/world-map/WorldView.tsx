"use client";

import { WORLD_CONTINENTS } from "../../_lib/world-map/continents";
import { getContinentProgress } from "../../_lib/engines/world-map-engine";
import { getStateVisuals } from "./world-map-visuals";
import { getCountryState } from "../../_lib/engines/world-map-engine";
import type { GoalTree } from "../../_lib/types/goal-tree";
import type { CharacterPosition } from "../../_lib/engines/world-map-engine";

type WorldViewProps = Readonly<{
  goalTree: GoalTree;
  characterPosition: CharacterPosition | null;
  onSelectContinent: (continentId: string) => void;
}>;

// Very simplified, stylized landmass silhouettes - a game-world map, not a
// cartographic projection. Kept intentionally abstract/soft.
const CONTINENT_BLOBS: Readonly<Record<string, string>> = {
  europe: "M480 60 Q560 55 600 90 Q615 120 590 150 Q560 165 520 155 Q470 150 460 110 Q455 75 480 60 Z",
  "north-america": "M120 40 Q260 20 300 90 Q310 150 260 210 Q210 250 160 220 Q110 190 100 130 Q95 75 120 40 Z",
  africa: "M470 180 Q590 170 620 240 Q640 300 590 350 Q540 380 500 340 Q460 300 460 240 Q455 200 470 180 Z",
  asia: "M640 40 Q860 30 900 130 Q910 200 820 230 Q720 250 660 190 Q615 130 640 40 Z",
  "south-america": "M260 260 Q360 250 380 320 Q390 380 340 420 Q300 440 280 390 Q255 330 260 260 Z",
  oceania: "M780 300 Q900 290 930 340 Q935 380 880 400 Q820 410 790 370 Q770 335 780 300 Z",
  antarctica: "M300 460 Q500 445 700 460 Q700 495 500 500 Q300 495 300 460 Z",
};

export default function WorldView({ goalTree, characterPosition, onSelectContinent }: WorldViewProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-purple-500/25 bg-[radial-gradient(circle_at_50%_20%,rgba(88,28,135,0.18),transparent_55%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(8,6,20,0.98))] p-4">
      <div className="relative aspect-[2/1] w-full">
        <svg viewBox="0 0 1000 500" className="absolute inset-0 h-full w-full">
          <defs>
            <pattern id="world-map-grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(148,163,184,0.06)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="1000" height="500" fill="url(#world-map-grid)" />
          {WORLD_CONTINENTS.map((continent) => {
            const progress = getContinentProgress(continent.id, goalTree);
            const visuals = getStateVisuals(getCountryState(progress));
            const blobPath = CONTINENT_BLOBS[continent.id];

            return blobPath ? (
              <path
                key={continent.id}
                d={blobPath}
                fill={visuals.ring}
                fillOpacity={progress > 0 ? 0.22 : 0.1}
                stroke={visuals.ring}
                strokeOpacity={0.5}
                strokeWidth={1.5}
                className={visuals.fogClass}
              />
            ) : null;
          })}
        </svg>

        {WORLD_CONTINENTS.map((continent) => {
          const progress = getContinentProgress(continent.id, goalTree);
          const state = getCountryState(progress);
          const visuals = getStateVisuals(state);
          const isCharacterHere = characterPosition?.continentId === continent.id;

          return (
            <button
              key={continent.id}
              type="button"
              onClick={() => onSelectContinent(continent.id)}
              style={{ left: `${(continent.position.x / 1000) * 100}%`, top: `${(continent.position.y / 500) * 100}%` }}
              className="group absolute -translate-x-1/2 -translate-y-1/2"
            >
              <span
                className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-2 backdrop-blur-sm transition group-hover:scale-105 ${visuals.border} ${visuals.bg} ${visuals.glow} ${visuals.fogClass}`}
              >
                <span className="text-xl">{continent.icon}</span>
                <span className={`text-[10px] font-bold uppercase tracking-[0.1em] ${visuals.text}`}>{continent.name}</span>
                <span className="text-[9px] text-slate-500">{continent.domainLabel}</span>
                <span className={`text-[10px] font-semibold ${visuals.text}`}>{progress}%</span>
              </span>
              {isCharacterHere ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg" title="You are here" aria-label="Character position">
                  🧍
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
