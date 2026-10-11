// Built-in environments: the cinematic artwork behind a domain.
//
// This is the REGISTRY, not the artwork. Each entry names a file Atlas
// will load from /images/atlas/environments/ if it is there, and the
// backdrop renders nothing at all when it is not - so the app ships and
// runs identically with an empty folder, and dropping a file in turns
// that domain's environment on with no code change.
//
// Keyed by domain theme id rather than by route, so an environment
// follows the theme: pin Trading to a page in Settings and that page gets
// the trading environment too, with no second mapping to maintain.

export type EnvironmentPosition = "center" | "top" | "bottom" | "left" | "right";

export type Environment = Readonly<{
  // A domain theme id, or a name of its own for a route-keyed
  // environment (see ROUTE_ENVIRONMENTS).
  id: string;
  // Relative to /images/atlas/environments/.
  file: string;
  // What the artwork should show. Kept in code because it is the brief
  // for whoever makes the image, and because it documents why a given
  // position and overlay were chosen.
  art: string;
  // Which part of a wide image to keep when the viewport is narrower.
  position: EnvironmentPosition;
  // How far the artwork is dimmed towards black, 0-1. Denser pages need
  // more; a page that is mostly empty can afford less. This is the
  // readability control - Atlas text is white.
  overlay: number;
}>;

const ENVIRONMENT_LIST: ReadonlyArray<Environment> = [
  {
    id: "home-base",
    file: "home-base.webp",
    art: "Operations room at night: panoramic window, distant city, restrained blue light, deep navy shadow.",
    position: "center",
    // Mission Control is the densest page in Atlas - widgets edge to edge.
    overlay: 0.72,
  },
  {
    id: "exploration",
    file: "exploration.webp",
    art: "Cartographic room: illuminated relief maps, terrain, warm lamp over dark wood.",
    position: "center",
    overlay: 0.6,
  },
  {
    id: "peace",
    file: "peace.webp",
    art: "Still interior at dusk: soft directional light, natural materials, nothing demanding attention.",
    position: "center",
    overlay: 0.5,
  },
  {
    id: "reading",
    file: "reading.webp",
    art: "Modern library: tall shelves, dark wood, warm lamps, shallow architectural depth.",
    position: "center",
    overlay: 0.62,
  },
  {
    id: "career",
    file: "career.webp",
    art: "Professional workspace above an international skyline at blue hour; ambition, not luxury.",
    position: "center",
    overlay: 0.68,
  },
  {
    id: "trading",
    file: "trading.webp",
    art: "Trader's desk at night: panoramic financial city, restrained displays off to one side. No charts, no numbers.",
    position: "center",
    overlay: 0.7,
  },
  {
    id: "startup",
    file: "startup.webp",
    art: "Sparse studio: whiteboard wall, concrete, one strong window, early-morning light.",
    position: "center",
    overlay: 0.66,
  },
  {
    id: "chess",
    file: "chess.webp",
    art: "Quiet study corner: a board mid-game under a single lamp, bone and gold tones.",
    position: "center",
    overlay: 0.6,
  },
  {
    id: "calisthenics",
    file: "calisthenics.webp",
    art: "Premium training studio: steel bars, textured concrete, dramatic daylight from high windows.",
    position: "center",
    overlay: 0.64,
  },
  {
    id: "mercor",
    file: "mercor.webp",
    art: "Focused work bay: clean desk, teal task lighting, orderly and impersonal.",
    position: "center",
    overlay: 0.68,
  },
  {
    id: "thesis",
    file: "thesis.webp",
    art: "Academic office: stacked papers, books, instruments, one lamp. Deliberately uncluttered in the centre.",
    position: "center",
    overlay: 0.66,
  },
  {
    id: "nutrition",
    file: "nutrition.webp",
    art: "Clean kitchen counter in morning light: stone, greenery, nothing styled or staged.",
    position: "center",
    overlay: 0.6,
  },
];

export const ENVIRONMENTS: Readonly<Record<string, Environment>> = Object.fromEntries(ENVIRONMENT_LIST.map((entry) => [entry.id, entry]));

// Environments addressed by ROUTE rather than by theme.
//
// Most pages are happy taking their domain theme's environment, but some
// deserve their own room while still inheriting the domain's palette.
// Quests is the case that forced this: it has no theme of its own, so it
// resolves to Home Base, and without a route entry the Quests artwork and
// the Mission Control artwork would collide on one key.
//
// Longest prefix wins, matching how themes and wallpapers already resolve.
const ROUTE_ENVIRONMENT_LIST: ReadonlyArray<Readonly<{ prefix: string; environment: Environment }>> = [
  {
    prefix: "/quests",
    environment: {
      id: "quests",
      file: "quests.webp",
      art: "Dark luxury study: fireplace, maps on the wall, panoramic window onto mountains at dusk. A mission room, not a lounge.",
      position: "center",
      // Quest lists are long and dense; the artwork has to sit well back.
      overlay: 0.7,
    },
  },
];

export const ROUTE_ENVIRONMENTS = ROUTE_ENVIRONMENT_LIST;

function normalizePathname(pathname: string): string {
  if (!pathname || !pathname.startsWith("/")) {
    return "/";
  }

  const withoutQuery = pathname.split(/[?#]/)[0];
  return withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, "") : "/";
}

export function resolveRouteEnvironment(pathname: string): Environment | null {
  const normalized = normalizePathname(pathname);

  return (
    [...ROUTE_ENVIRONMENT_LIST]
      .filter((entry) => (entry.prefix === "/" ? normalized === "/" : normalized === entry.prefix || normalized.startsWith(entry.prefix + "/")))
      .sort((first, second) => second.prefix.length - first.prefix.length)[0]?.environment ?? null
  );
}

export const ENVIRONMENT_BASE_PATH = "/images/atlas/environments";

export function environmentSrc(environment: Environment): string {
  return `${ENVIRONMENT_BASE_PATH}/${environment.file}`;
}

// A custom theme has no environment of its own. It inherits the one for
// the built-in theme it was based on, so a user's palette still lands in
// a coherent room rather than on a flat background.
// A page's environment: its own if the route claims one, otherwise its
// domain theme's. A custom theme has none of its own and inherits the
// built-in theme it was based on, so a user palette still lands in a
// coherent room rather than on a flat background.
export function resolveEnvironment(pathname: string, themeId: string, baseThemeId?: string): Environment | null {
  return resolveRouteEnvironment(pathname) ?? ENVIRONMENTS[themeId] ?? (baseThemeId ? ENVIRONMENTS[baseThemeId] : undefined) ?? null;
}

// CSS object-position for the chosen crop.
export function environmentObjectPosition(position: EnvironmentPosition): string {
  if (position === "top") return "50% 0%";
  if (position === "bottom") return "50% 100%";
  if (position === "left") return "0% 50%";
  if (position === "right") return "100% 50%";
  return "50% 50%";
}
