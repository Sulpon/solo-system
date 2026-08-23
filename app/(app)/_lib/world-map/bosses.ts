import { WORLD_COUNTRIES } from "./countries";
import type { CountryBoss } from "../types/world-map";

// One locked placeholder Boss per seeded country - no defeat mechanic exists
// yet (see spec: "do not implement complex Boss logic yet"), so every
// status is "locked" until a future pass adds real requirements/combat.
const BOSS_NAMES: ReadonlyArray<Readonly<{ countryId: string; name: string; description: string }>> = [
  { countryId: "italy", name: "The Mirror", description: "Faces you with an unfiltered view of yourself." },
  { countryId: "france", name: "The Unread Shelf", description: "Every book you meant to finish, at once." },
  { countryId: "germany", name: "The Contradiction", description: "A logic puzzle with no comfortable answer." },
  { countryId: "united-kingdom", name: "The Silence", description: "The moment you have nothing prepared to say." },
  { countryId: "greece", name: "The Oracle", description: "Answers only the questions you're afraid to ask." },
  { countryId: "usa", name: "The Strategist", description: "Plays the long game better than you do - for now." },
  { countryId: "canada", name: "The Drawdown", description: "The worst losing streak you haven't survived yet." },
  { countryId: "mexico", name: "The Crowd", description: "Every emotion the market wants you to feel." },
  { countryId: "south-africa", name: "The Plateau", description: "The weight that stopped moving." },
  { countryId: "kenya", name: "The Wall", description: "The mile where your legs want to stop." },
  { countryId: "egypt", name: "The Excuse", description: "The reason that always sounds reasonable." },
  { countryId: "morocco", name: "The Stiffness", description: "The range of motion you gave up on." },
  { countryId: "ethiopia", name: "The Fatigue", description: "The point past 'I'm tired'." },
  { countryId: "japan", name: "The Repetition", description: "Rep ten thousand and one." },
  { countryId: "south-korea", name: "The Missed Day", description: "The day the streak almost broke." },
  { countryId: "india", name: "The Restless Mind", description: "Ten minutes of stillness, uninterrupted." },
  { countryId: "china", name: "The Long Road", description: "The distance where motivation runs out." },
  { countryId: "thailand", name: "The Impulse", description: "The reaction before the choice." },
  { countryId: "brazil", name: "The Doubt", description: "The voice that says you can't." },
  { countryId: "argentina", name: "The Mask", description: "The version of you built for other people." },
  { countryId: "chile", name: "The Setback", description: "The failure that hasn't been turned into data yet." },
  { countryId: "peru", name: "The Blind Spot", description: "The pattern you can't see in yourself." },
  { countryId: "colombia", name: "The Misread Room", description: "The moment you misjudged the people around you." },
  { countryId: "australia", name: "The Comfort Zone", description: "The edge of the map you haven't crossed." },
  { countryId: "new-zealand", name: "The Easier Path", description: "The route you know is worse, but familiar." },
  { countryId: "fiji", name: "The Blank Page", description: "Nothing made yet." },
];

export const COUNTRY_BOSSES: ReadonlyArray<CountryBoss> = BOSS_NAMES.filter((entry) => WORLD_COUNTRIES.some((country) => country.id === entry.countryId)).map((entry) => ({
  id: `boss-${entry.countryId}`,
  countryId: entry.countryId,
  name: entry.name,
  description: entry.description,
  requirements: ["Country progress: 100%", "Requires future Skill/Dungeon system"],
  status: "locked",
}));

export function getBossForCountry(countryId: string): CountryBoss | null {
  return COUNTRY_BOSSES.find((boss) => boss.countryId === countryId) ?? null;
}
