import { WORLD_COUNTRIES } from "./countries";
import type { WorldDungeon } from "../types/world-map";

// Real historical/cultural landmarks per seeded country, as locked
// placeholders - no AI Dungeon generation yet (per spec). Pure data,
// referenced by id from WorldCountry.dungeonIds, never hardcoded into a
// component. All "training" for now; "challenge"/"boss" typing will matter
// once the real Dungeon system exists.
const DUNGEON_NAMES: ReadonlyArray<Readonly<{ countryId: string; name: string }>> = [
  { countryId: "italy", name: "Colosseum" },
  { countryId: "italy", name: "Leaning Tower of Pisa" },
  { countryId: "italy", name: "Pompeii" },
  { countryId: "italy", name: "Castel Sant'Angelo" },

  { countryId: "france", name: "Eiffel Tower" },
  { countryId: "france", name: "Louvre" },
  { countryId: "france", name: "Palace of Versailles" },
  { countryId: "france", name: "Mont-Saint-Michel" },

  { countryId: "germany", name: "Neuschwanstein Castle" },
  { countryId: "germany", name: "Brandenburg Gate" },
  { countryId: "germany", name: "Cologne Cathedral" },

  { countryId: "united-kingdom", name: "Stonehenge" },
  { countryId: "united-kingdom", name: "Tower of London" },
  { countryId: "united-kingdom", name: "Edinburgh Castle" },

  { countryId: "greece", name: "The Parthenon" },
  { countryId: "greece", name: "Delphi" },
  { countryId: "greece", name: "Knossos" },

  { countryId: "usa", name: "Statue of Liberty" },
  { countryId: "usa", name: "Grand Canyon" },
  { countryId: "usa", name: "Golden Gate Bridge" },
  { countryId: "usa", name: "United States Capitol" },

  { countryId: "canada", name: "Niagara Falls" },
  { countryId: "canada", name: "Banff National Park" },
  { countryId: "canada", name: "CN Tower" },

  { countryId: "mexico", name: "Chichen Itza" },
  { countryId: "mexico", name: "Teotihuacan" },
  { countryId: "mexico", name: "Palenque" },

  { countryId: "south-africa", name: "Table Mountain" },
  { countryId: "south-africa", name: "Robben Island" },
  { countryId: "south-africa", name: "Kruger National Park" },

  { countryId: "kenya", name: "Maasai Mara" },
  { countryId: "kenya", name: "Mount Kenya" },
  { countryId: "kenya", name: "Great Rift Valley" },

  { countryId: "egypt", name: "Great Pyramid of Giza" },
  { countryId: "egypt", name: "The Sphinx" },
  { countryId: "egypt", name: "Valley of the Kings" },

  { countryId: "morocco", name: "Chefchaouen" },
  { countryId: "morocco", name: "Sahara Desert" },
  { countryId: "morocco", name: "Hassan II Mosque" },

  { countryId: "ethiopia", name: "Lalibela Rock Churches" },
  { countryId: "ethiopia", name: "Simien Mountains" },

  { countryId: "japan", name: "Mount Fuji" },
  { countryId: "japan", name: "Himeji Castle" },
  { countryId: "japan", name: "Fushimi Inari Shrine" },
  { countryId: "japan", name: "Kinkaku-ji" },

  { countryId: "south-korea", name: "Gyeongbokgung Palace" },
  { countryId: "south-korea", name: "Bukchon Hanok Village" },
  { countryId: "south-korea", name: "Jeju Island" },

  { countryId: "india", name: "Taj Mahal" },
  { countryId: "india", name: "Varanasi Ghats" },
  { countryId: "india", name: "Jaipur Amber Fort" },

  { countryId: "china", name: "Great Wall of China" },
  { countryId: "china", name: "Forbidden City" },
  { countryId: "china", name: "Terracotta Army" },

  { countryId: "thailand", name: "Wat Arun" },
  { countryId: "thailand", name: "Ayutthaya" },
  { countryId: "thailand", name: "Grand Palace" },

  { countryId: "brazil", name: "Christ the Redeemer" },
  { countryId: "brazil", name: "Iguazu Falls" },
  { countryId: "brazil", name: "Amazon Rainforest" },

  { countryId: "argentina", name: "Perito Moreno Glacier" },
  { countryId: "argentina", name: "Recoleta Cemetery" },
  { countryId: "argentina", name: "Ushuaia" },

  { countryId: "chile", name: "Easter Island" },
  { countryId: "chile", name: "Atacama Desert" },
  { countryId: "chile", name: "Torres del Paine" },

  { countryId: "peru", name: "Machu Picchu" },
  { countryId: "peru", name: "Nazca Lines" },
  { countryId: "peru", name: "Sacred Valley" },

  { countryId: "colombia", name: "Ciudad Perdida" },
  { countryId: "colombia", name: "Cartagena Old Town" },
  { countryId: "colombia", name: "Cocora Valley" },

  { countryId: "australia", name: "Uluru" },
  { countryId: "australia", name: "Sydney Opera House" },
  { countryId: "australia", name: "Great Barrier Reef" },

  { countryId: "new-zealand", name: "Milford Sound" },
  { countryId: "new-zealand", name: "Hobbiton" },
  { countryId: "new-zealand", name: "Tongariro Crossing" },

  { countryId: "fiji", name: "Sawa-i-Lau Caves" },
  { countryId: "fiji", name: "Coral Coast" },
];

export const WORLD_DUNGEONS: ReadonlyArray<WorldDungeon> = DUNGEON_NAMES.filter((entry) => WORLD_COUNTRIES.some((country) => country.id === entry.countryId)).map((entry, index) => ({
  id: `dungeon-${entry.countryId}-${index}`,
  countryId: entry.countryId,
  name: entry.name,
  type: "training",
  difficulty: 1,
  objective: `Explore ${entry.name} - unlocks with future Dungeon content.`,
  status: "locked",
}));

export function getDungeonsForCountry(countryId: string): WorldDungeon[] {
  return WORLD_DUNGEONS.filter((dungeon) => dungeon.countryId === countryId);
}
