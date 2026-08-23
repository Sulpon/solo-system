import type { RivalArchetype } from "../types/world-map";

// Fictional motivational rivals, not real users (see spec). Growth is
// deterministic and conservative - one level every 12-16 days, computed
// from the calendar date, never Math.random() - so they never leap ahead
// arbitrarily and render identically on every reload.
export const RIVAL_ARCHETYPES: ReadonlyArray<RivalArchetype> = [
  {
    id: "the-scholar",
    name: "The Scholar",
    description: "Reads everything, forgets nothing, argues well.",
    icon: "📚",
    baseLevel: 18,
    daysPerLevel: 14,
    statProfile: { Logic: 82, Reading: 91, Writing: 76, Trading: 21, Physical: 34 },
  },
  {
    id: "the-warrior",
    name: "The Warrior",
    description: "Trains through anything. Skips nothing.",
    icon: "🛡️",
    baseLevel: 20,
    daysPerLevel: 12,
    statProfile: { Physical: 88, Discipline: 79, Logic: 31, Trading: 18 },
  },
  {
    id: "the-strategist",
    name: "The Strategist",
    description: "Plays the long game. Rarely tilts.",
    icon: "♟️",
    baseLevel: 22,
    daysPerLevel: 16,
    statProfile: { Trading: 84, Logic: 77, Statistics: 72, Physical: 29 },
  },
];

export function getRival(rivalId: string): RivalArchetype | null {
  return RIVAL_ARCHETYPES.find((rival) => rival.id === rivalId) ?? null;
}
