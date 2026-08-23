import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Topology } from "topojson-specification";
import worldTopology from "world-atlas/countries-110m.json";
import { WORLD_COUNTRIES, getCountriesForContinent } from "./countries";

export type CountryFeatureProperties = Readonly<{ name: string }>;

// Real country boundaries (Natural Earth, via world-atlas), converted once
// from topojson to GeoJSON at module load - the only place geographic data
// touches this app. Never edit country shapes by hand; everything renders
// straight from this. ~108KB, 177 features at 110m resolution.
export const WORLD_COUNTRY_FEATURES: FeatureCollection<Geometry, CountryFeatureProperties> = feature(
  worldTopology as unknown as Topology,
  (worldTopology as unknown as Topology).objects.countries as never,
) as unknown as FeatureCollection<Geometry, CountryFeatureProperties>;

// Standard ISO 3166-1 numeric codes, matched against each GeoJSON feature's
// `id` - this is how a seeded WorldCountry (see world-map/countries.ts)
// finds its real shape on the map.
export const WORLD_COUNTRY_ISO_NUMERIC: Readonly<Record<string, number>> = {
  italy: 380,
  france: 250,
  germany: 276,
  "united-kingdom": 826,
  greece: 300,
  usa: 840,
  canada: 124,
  mexico: 484,
  "south-africa": 710,
  kenya: 404,
  egypt: 818,
  morocco: 504,
  ethiopia: 231,
  japan: 392,
  "south-korea": 410,
  india: 356,
  china: 156,
  thailand: 764,
  brazil: 76,
  argentina: 32,
  chile: 152,
  peru: 604,
  colombia: 170,
  australia: 36,
  "new-zealand": 554,
  fiji: 242,
};

const FEATURE_BY_ISO_NUMERIC = new Map(WORLD_COUNTRY_FEATURES.features.map((feature) => [Number(feature.id), feature]));

export function getCountryFeature(countryId: string) {
  const isoNumeric = WORLD_COUNTRY_ISO_NUMERIC[countryId];
  return isoNumeric !== undefined ? (FEATURE_BY_ISO_NUMERIC.get(isoNumeric) ?? null) : null;
}

// The projection is fit to the actual shapes being shown, not a synthetic
// bounding box - a hand-authored lon/lat rectangle risks the wrong GeoJSON
// ring winding (interpreted by d3-geo as "the rest of the sphere", which is
// exactly the bug this caused the first time). Fitting to real feature
// geometry sidesteps that entirely and is more true to "real data" besides.

// Every real country except Antarctica (whose true shape stretches to -90
// latitude and would otherwise dominate the fit) - the frame the World view
// zooms to.
export const WORLD_FRAME: FeatureCollection<Geometry, CountryFeatureProperties> = {
  type: "FeatureCollection",
  features: WORLD_COUNTRY_FEATURES.features.filter((featureItem) => featureItem.properties.name !== "Antarctica"),
};

// A continent's frame = the real shapes of its own seeded countries, so
// zooming in fits tightly around exactly what's interactive there.
export function getContinentFrame(continentId: string): FeatureCollection<Geometry, CountryFeatureProperties> | null {
  const countryIds = new Set(getCountriesForContinent(continentId).map((country) => country.id));
  const features = WORLD_COUNTRIES.filter((country) => countryIds.has(country.id))
    .map((country) => getCountryFeature(country.id))
    .filter((featureItem): featureItem is Feature<Geometry, CountryFeatureProperties> => featureItem !== null);

  return features.length > 0 ? { type: "FeatureCollection", features } : null;
}

// Real (approximate) lon/lat bounding boxes per continent - used only to
// place each continent's label marker in the World view, not for fitting the
// projection (see getContinentFrame above).
const CONTINENT_BOUNDS: Readonly<Record<string, Readonly<{ lon0: number; lat0: number; lon1: number; lat1: number }>>> = {
  europe: { lon0: -25, lat0: 34, lon1: 45, lat1: 71 },
  "north-america": { lon0: -170, lat0: 5, lon1: -50, lat1: 75 },
  africa: { lon0: -20, lat0: -35, lon1: 55, lat1: 38 },
  asia: { lon0: 26, lat0: -10, lon1: 150, lat1: 55 },
  "south-america": { lon0: -82, lat0: -56, lon1: -34, lat1: 13 },
  oceania: { lon0: 110, lat0: -48, lon1: 180, lat1: 5 },
};

export function getContinentCentroid(continentId: string): readonly [number, number] | null {
  const bounds = CONTINENT_BOUNDS[continentId];
  return bounds ? [(bounds.lon0 + bounds.lon1) / 2, (bounds.lat0 + bounds.lat1) / 2] : null;
}

// Real approximate lon/lat marker coordinates (geographic center / capital
// area) for each seeded country - used to place labels, the player marker,
// and rival markers precisely, without depending on a shape's computed
// centroid (unreliable for antimeridian-spanning island nations like Fiji).
export const COUNTRY_MARKER_COORDS: Readonly<Record<string, readonly [number, number]>> = {
  italy: [12.5, 42.5],
  france: [2.3, 46.6],
  germany: [10.5, 51.2],
  "united-kingdom": [-1.5, 52.5],
  greece: [21.8, 39.7],
  usa: [-98.5, 39.8],
  canada: [-106.3, 56.1],
  mexico: [-102.5, 23.6],
  "south-africa": [24.7, -28.5],
  kenya: [37.9, 0.0],
  egypt: [30.8, 26.8],
  morocco: [-7.1, 31.8],
  ethiopia: [39.5, 8.6],
  japan: [138.2, 36.2],
  "south-korea": [127.8, 35.9],
  india: [78.9, 22.0],
  china: [104.2, 35.9],
  thailand: [101.0, 15.0],
  brazil: [-51.9, -14.2],
  argentina: [-63.6, -38.4],
  chile: [-71.5, -35.7],
  peru: [-75.0, -9.2],
  colombia: [-74.3, 4.6],
  australia: [133.8, -25.3],
  "new-zealand": [172.8, -41.5],
  fiji: [178.0, -17.7],
};

export function getCountryMarkerCoords(countryId: string): readonly [number, number] | null {
  return COUNTRY_MARKER_COORDS[countryId] ?? null;
}

function haversineDistanceKm(a: readonly [number, number], b: readonly [number, number]): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const haversine = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
}

export type NearestCountry = Readonly<{ id: string; distanceKm: number }>;

// Real geographic distance between seeded countries, using the same marker
// coordinates the map renders from - no adjacency/border dataset needed.
// Drives Rival movement (world-map/rival-simulation-engine.ts) so a rival
// steps to nearby countries instead of teleporting across the globe.
export function getNearestCountries(countryId: string, limit = 26): ReadonlyArray<NearestCountry> {
  const origin = COUNTRY_MARKER_COORDS[countryId];

  if (!origin) {
    return [];
  }

  return Object.entries(COUNTRY_MARKER_COORDS)
    .filter(([id]) => id !== countryId)
    .map(([id, coords]) => ({ id, distanceKm: haversineDistanceKm(origin, coords) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
