"use client";

import { useMemo } from "react";
import { geoEquirectangular, geoPath, type GeoProjection } from "d3-geo";
import { WORLD_CONTINENTS } from "../../_lib/world-map/continents";
import { WORLD_COUNTRIES, getCountriesForContinent } from "../../_lib/world-map/countries";
import { getRivalIdentity } from "../../_lib/world-map/rival-roster";
import { getCountryDisplayState, getCountryStateLabel } from "../../_lib/engines/world-map-engine";
import { getStateVisuals } from "./world-map-visuals";
import { WORLD_COUNTRY_FEATURES, WORLD_FRAME, getContinentFrame, getContinentCentroid, getCountryFeature, getCountryMarkerCoords } from "../../_lib/world-map/geo-data";
import type { GoalTree } from "../../_lib/types/goal-tree";
import type { CharacterPosition } from "../../_lib/engines/world-map-engine";
import type { RivalState } from "../../_lib/types/rival";

const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 480;

type WorldMapCanvasProps = Readonly<{
  goalTree: GoalTree;
  characterPosition: CharacterPosition | null;
  rivalStates: Readonly<Record<string, RivalState>>;
  // null = world scope (all continents); a continentId = zoomed-in scope.
  continentId?: string | null;
  selectedCountryId?: string | null;
  onSelectCountry: (countryId: string) => void;
  onSelectContinent?: (continentId: string) => void;
  onSelectRival?: (rivalId: string) => void;
}>;

function usePixel(projection: GeoProjection) {
  return (lon: number, lat: number): [number, number] | null => projection([lon, lat]);
}

export default function WorldMapCanvas({
  goalTree,
  characterPosition,
  rivalStates,
  continentId = null,
  selectedCountryId = null,
  onSelectCountry,
  onSelectContinent,
  onSelectRival,
}: WorldMapCanvasProps) {
  const projection = useMemo(() => {
    const frame = (continentId && getContinentFrame(continentId)) || WORLD_FRAME;
    return geoEquirectangular().fitExtent(
      [
        [16, 16],
        [VIEW_WIDTH - 16, VIEW_HEIGHT - 16],
      ],
      frame,
    );
  }, [continentId]);

  const path = useMemo(() => geoPath(projection), [projection]);
  const toPixel = usePixel(projection);

  const seededCountries = continentId ? getCountriesForContinent(continentId) : WORLD_COUNTRIES;

  const rivalsByCountry = useMemo(() => {
    const map = new Map<string, RivalState[]>();
    Object.values(rivalStates).forEach((state) => {
      const list = map.get(state.currentCountryId) ?? [];
      list.push(state);
      map.set(state.currentCountryId, list);
    });
    return map;
  }, [rivalStates]);

  return (
    <div className="relative aspect-[2/1] w-full overflow-hidden rounded-xl">
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="absolute inset-0 block h-full w-full">
        <defs>
          <radialGradient id="wm-ocean" cx="50%" cy="32%" r="80%">
            <stop offset="0%" stopColor="#0c1428" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>
          <radialGradient id="wm-vignette" cx="50%" cy="50%" r="72%">
            <stop offset="60%" stopColor="black" stopOpacity="0" />
            <stop offset="100%" stopColor="black" stopOpacity="0.55" />
          </radialGradient>
        </defs>

        <rect x={0} y={0} width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#wm-ocean)" />

        {/* Fog-of-war base layer: every real country on Earth, subdued and
            non-interactive - grounds the map in real geography even where
            Atlas has no data yet. */}
        <g>
          {WORLD_COUNTRY_FEATURES.features.map((featureItem) => (
            // Keyed by name, not id - a handful of disputed territories
            // (N. Cyprus, Somaliland, Kosovo) share an undefined id in the
            // source data, but every feature's name is unique.
            <path key={featureItem.properties.name} d={path(featureItem) ?? undefined} fill="#111c34" fillOpacity={0.6} stroke="#1e293b" strokeWidth={0.5} />
          ))}
        </g>

        {/* Seeded, stateful countries - real borders, ownership-driven glow */}
        <g>
          {seededCountries.map((country) => {
            const featureItem = getCountryFeature(country.id);
            if (!featureItem) {
              return null;
            }

            const state = getCountryDisplayState(country.id, goalTree, rivalStates);
            const visuals = getStateVisuals(state);
            const isSelected = selectedCountryId === country.id;

            return (
              <path
                key={country.id}
                d={path(featureItem) ?? undefined}
                fill={visuals.ring}
                fillOpacity={state === "unknown" ? 0.14 : 0.34}
                stroke={visuals.ring}
                strokeOpacity={0.85}
                strokeWidth={isSelected ? 2.25 : 1.1}
                strokeDasharray={state === "contested" ? "5 3" : undefined}
                className={"cursor-pointer transition-[fill-opacity] duration-200 hover:fill-opacity-60 " + (visuals.pulse ? "animate-pulse" : "")}
                onClick={() => onSelectCountry(country.id)}
              >
                <title>
                  {country.name} - {getCountryStateLabel(state)}
                </title>
              </path>
            );
          })}
        </g>

        <rect x={0} y={0} width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#wm-vignette)" className="pointer-events-none" />
      </svg>

      {/* HTML overlay: continent/country labels, player marker, rival markers */}
      <div className="pointer-events-none absolute inset-0">
        {!continentId
          ? WORLD_CONTINENTS.map((continent) => {
              const centroid = getContinentCentroid(continent.id);
              const pixel = centroid ? toPixel(centroid[0], centroid[1]) : null;
              if (!pixel) {
                return null;
              }

              const isCharacterHere = characterPosition?.continentId === continent.id;
              const left = (pixel[0] / VIEW_WIDTH) * 100;
              const top = (pixel[1] / VIEW_HEIGHT) * 100;

              return (
                <button
                  key={continent.id}
                  type="button"
                  onClick={() => onSelectContinent?.(continent.id)}
                  style={{ left: `${left}%`, top: `${top}%` }}
                  className="group pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
                >
                  <span className="flex flex-col items-center gap-0.5 rounded-lg border border-purple-400/30 bg-slate-950/70 px-2.5 py-1.5 backdrop-blur-sm transition group-hover:scale-105 group-hover:border-purple-300/60">
                    <span className="text-base leading-none">{continent.icon}</span>
                    <span className="whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.08em] text-slate-200">{continent.name}</span>
                  </span>
                  {isCharacterHere ? (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-base drop-shadow-[0_0_6px_rgba(192,132,252,0.8)]" title="You are here">
                      🧍
                    </span>
                  ) : null}
                </button>
              );
            })
          : seededCountries.map((country) => {
              const coords = getCountryMarkerCoords(country.id);
              const pixel = coords ? toPixel(coords[0], coords[1]) : null;
              if (!pixel) {
                return null;
              }

              const state = getCountryDisplayState(country.id, goalTree, rivalStates);
              const visuals = getStateVisuals(state);
              const isCharacterHere = characterPosition?.countryId === country.id;
              const rivalsHere = rivalsByCountry.get(country.id) ?? [];
              const left = (pixel[0] / VIEW_WIDTH) * 100;
              const top = (pixel[1] / VIEW_HEIGHT) * 100;

              return (
                <button
                  key={country.id}
                  type="button"
                  onClick={() => onSelectCountry(country.id)}
                  style={{ left: `${left}%`, top: `${top}%` }}
                  className="group pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
                >
                  <span
                    className={`flex flex-col items-center gap-0.5 rounded-lg border px-2 py-1 backdrop-blur-sm transition group-hover:scale-105 ${visuals.border} ${visuals.bg} ${visuals.glow}`}
                  >
                    <span className="text-sm leading-none">{country.flag}</span>
                    <span className="whitespace-nowrap text-[9px] font-bold text-white">{country.name}</span>
                  </span>

                  {isCharacterHere ? (
                    <span
                      className="absolute -top-4 left-1/2 -translate-x-1/2 animate-pulse text-lg drop-shadow-[0_0_8px_rgba(192,132,252,0.9)]"
                      title={`You are here${characterPosition?.goalTitle ? ` - ${characterPosition.goalTitle}` : ""}`}
                    >
                      🧍
                    </span>
                  ) : null}

                  {/* Rival markers - always visually smaller/subordinate to
                      the player marker above, per spec. Clickable to open a
                      Rival Profile without navigating the map. */}
                  {rivalsHere.length > 0 ? (
                    <span className="pointer-events-auto absolute -bottom-3 left-1/2 flex -translate-x-1/2 gap-0.5">
                      {rivalsHere.slice(0, 3).map((rivalState) => {
                        const identity = getRivalIdentity(rivalState.identityId);
                        if (!identity) {
                          return null;
                        }
                        const isEncounter = isCharacterHere;
                        return (
                          <span
                            key={rivalState.identityId}
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              event.stopPropagation();
                              onSelectRival?.(rivalState.identityId);
                            }}
                            className="cursor-pointer text-[10px] leading-none opacity-90 hover:opacity-100"
                            title={`${identity.name} (${identity.title})${isEncounter ? " - Rival encounter" : " - Rival nearby"}`}
                          >
                            {isEncounter ? "⚔️" : "⚠️"} {identity.icon}
                          </span>
                        );
                      })}
                    </span>
                  ) : null}
                </button>
              );
            })}
      </div>
    </div>
  );
}
