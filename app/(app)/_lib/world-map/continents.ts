import type { WorldContinent } from "../types/world-map";

// Positions are (x, y) on a 1000x500 equirectangular-style viewBox
// (x = (lon+180)/360*1000, y = (90-lat)/180*500, using each continent's
// rough centroid) - real relative geography, not arbitrary placement.
export const WORLD_CONTINENTS: ReadonlyArray<WorldContinent> = [
  {
    id: "europe",
    name: "Europe",
    domain: "mind",
    domainLabel: "Mind",
    description: "The continent of thought - consciousness, logic, philosophy, and communication.",
    icon: "🏛️",
    position: { x: 542, y: 100 },
    order: 1,
  },
  {
    id: "north-america",
    name: "North America",
    domain: "career-money",
    domainLabel: "Career / Money",
    description: "The continent of markets - strategy, risk, and market psychology.",
    icon: "📈",
    position: { x: 222, y: 125 },
    order: 2,
  },
  {
    id: "africa",
    name: "Africa",
    domain: "body",
    domainLabel: "Body",
    description: "The continent of strength - discipline, endurance, and physical mastery.",
    icon: "🦾",
    position: { x: 558, y: 247 },
    order: 3,
  },
  {
    id: "asia",
    name: "Asia",
    domain: "discipline",
    domainLabel: "Discipline",
    description: "The continent of consistency - meditation, persistence, and self-control.",
    icon: "🏯",
    position: { x: 778, y: 125 },
    order: 4,
  },
  {
    id: "south-america",
    name: "South America",
    domain: "spirit-identity",
    domainLabel: "Spirit / Identity",
    description: "The continent of self - confidence, identity, and resilience.",
    icon: "🌿",
    position: { x: 333, y: 292 },
    order: 5,
  },
  {
    id: "oceania",
    name: "Oceania",
    domain: "life-exploration",
    domainLabel: "Life / Exploration",
    description: "The continent of the unknown path - exploration, adventure, and creativity.",
    icon: "🏝️",
    position: { x: 875, y: 319 },
    order: 6,
  },
  {
    id: "antarctica",
    name: "Antarctica",
    domain: "unknown",
    domainLabel: "Unknown / Endgame",
    description: "Uncharted. What lies beyond mastery of every other continent is not yet known.",
    icon: "❄️",
    position: { x: 500, y: 472 },
    order: 7,
  },
];

export function getContinent(continentId: string): WorldContinent | null {
  return WORLD_CONTINENTS.find((continent) => continent.id === continentId) ?? null;
}
