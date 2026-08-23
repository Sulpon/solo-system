import type { WorldCountry } from "../types/world-map";

// Positions are (x, y) within each continent's own 400x300 local viewBox,
// placed at approximately correct relative geography (e.g. UK northwest of
// France, Japan east of China) - a stylized layout, not a precise
// cartographic projection. New countries are added here only - no UI code
// changes needed, per the spec's "data-driven, not hardcoded into the UI".
export const WORLD_COUNTRIES: ReadonlyArray<WorldCountry> = [
  // Europe -> Mind
  { id: "italy", continentId: "europe", name: "Italy", flag: "🇮🇹", domain: "Consciousness", description: "Awareness of the self.", position: { x: 230, y: 190 }, bossId: "boss-italy" },
  { id: "france", continentId: "europe", name: "France", flag: "🇫🇷", domain: "Reading", description: "The habit of the well-read mind.", position: { x: 140, y: 130 }, bossId: "boss-france" },
  { id: "germany", continentId: "europe", name: "Germany", flag: "🇩🇪", domain: "Logic", description: "Structured, rigorous thought.", position: { x: 200, y: 90 }, bossId: "boss-germany" },
  { id: "united-kingdom", continentId: "europe", name: "United Kingdom", flag: "🇬🇧", domain: "Communication", description: "Clarity of expression.", position: { x: 70, y: 60 }, bossId: "boss-united-kingdom" },
  { id: "greece", continentId: "europe", name: "Greece", flag: "🇬🇷", domain: "Philosophy", description: "The examined life.", position: { x: 300, y: 220 }, bossId: "boss-greece" },

  // North America -> Trading
  { id: "usa", continentId: "north-america", name: "USA", flag: "🇺🇸", domain: "Strategy", description: "Long-term edge over short-term noise.", position: { x: 150, y: 150 }, bossId: "boss-usa" },
  { id: "canada", continentId: "north-america", name: "Canada", flag: "🇨🇦", domain: "Risk Management", description: "Surviving to trade another day.", position: { x: 150, y: 60 }, bossId: "boss-canada" },
  { id: "mexico", continentId: "north-america", name: "Mexico", flag: "🇲🇽", domain: "Market Psychology", description: "Reading the crowd, not just the chart.", position: { x: 140, y: 230 }, bossId: "boss-mexico" },

  // Africa -> Body
  { id: "south-africa", continentId: "africa", name: "South Africa", flag: "🇿🇦", domain: "Strength", description: "Raw physical capacity.", position: { x: 220, y: 270 }, bossId: "boss-south-africa" },
  { id: "kenya", continentId: "africa", name: "Kenya", flag: "🇰🇪", domain: "Running", description: "Distance, pace, endurance on foot.", position: { x: 260, y: 190 }, bossId: "boss-kenya" },
  { id: "egypt", continentId: "africa", name: "Egypt", flag: "🇪🇬", domain: "Discipline", description: "Showing up without exception.", position: { x: 230, y: 60 }, bossId: "boss-egypt" },
  { id: "morocco", continentId: "africa", name: "Morocco", flag: "🇲🇦", domain: "Mobility", description: "Range of motion, freedom of movement.", position: { x: 100, y: 70 }, bossId: "boss-morocco" },
  { id: "ethiopia", continentId: "africa", name: "Ethiopia", flag: "🇪🇹", domain: "Endurance", description: "Sustained effort over time.", position: { x: 270, y: 150 }, bossId: "boss-ethiopia" },

  // Asia -> Discipline
  { id: "japan", continentId: "asia", name: "Japan", flag: "🇯🇵", domain: "Discipline", description: "Precision through repetition.", position: { x: 340, y: 110 }, bossId: "boss-japan" },
  { id: "south-korea", continentId: "asia", name: "South Korea", flag: "🇰🇷", domain: "Consistency", description: "Never missing twice.", position: { x: 300, y: 100 }, bossId: "boss-south-korea" },
  { id: "india", continentId: "asia", name: "India", flag: "🇮🇳", domain: "Meditation", description: "Stillness as a practiced skill.", position: { x: 200, y: 170 }, bossId: "boss-india" },
  { id: "china", continentId: "asia", name: "China", flag: "🇨🇳", domain: "Persistence", description: "Continuing when it stops being easy.", position: { x: 250, y: 110 }, bossId: "boss-china" },
  { id: "thailand", continentId: "asia", name: "Thailand", flag: "🇹🇭", domain: "Self-Control", description: "Choosing the response, not the reaction.", position: { x: 250, y: 200 }, bossId: "boss-thailand" },

  // South America -> Spirit / Identity
  { id: "brazil", continentId: "south-america", name: "Brazil", flag: "🇧🇷", domain: "Confidence", description: "Trusting your own capability.", position: { x: 220, y: 130 }, bossId: "boss-brazil" },
  { id: "argentina", continentId: "south-america", name: "Argentina", flag: "🇦🇷", domain: "Identity", description: "Knowing who you actually are.", position: { x: 150, y: 250 }, bossId: "boss-argentina" },
  { id: "chile", continentId: "south-america", name: "Chile", flag: "🇨🇱", domain: "Resilience", description: "Bouncing back, on schedule.", position: { x: 110, y: 230 }, bossId: "boss-chile" },
  { id: "peru", continentId: "south-america", name: "Peru", flag: "🇵🇪", domain: "Reflection", description: "Looking back honestly.", position: { x: 120, y: 130 }, bossId: "boss-peru" },
  { id: "colombia", continentId: "south-america", name: "Colombia", flag: "🇨🇴", domain: "Social Awareness", description: "Reading rooms and relationships.", position: { x: 150, y: 60 }, bossId: "boss-colombia" },

  // Oceania -> Adventure
  { id: "australia", continentId: "oceania", name: "Australia", flag: "🇦🇺", domain: "Exploration", description: "Going somewhere new on purpose.", position: { x: 180, y: 150 }, bossId: "boss-australia" },
  { id: "new-zealand", continentId: "oceania", name: "New Zealand", flag: "🇳🇿", domain: "Adventure", description: "Seeking the harder, better path.", position: { x: 280, y: 220 }, bossId: "boss-new-zealand" },
  { id: "fiji", continentId: "oceania", name: "Fiji", flag: "🇫🇯", domain: "Creativity", description: "Making something that didn't exist before.", position: { x: 300, y: 150 }, bossId: "boss-fiji" },
];

export function getCountry(countryId: string): WorldCountry | null {
  return WORLD_COUNTRIES.find((country) => country.id === countryId) ?? null;
}

export function getCountriesForContinent(continentId: string): WorldCountry[] {
  return WORLD_COUNTRIES.filter((country) => country.continentId === continentId);
}
