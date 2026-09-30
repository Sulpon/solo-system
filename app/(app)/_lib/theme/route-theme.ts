import { DEFAULT_DOMAIN_THEME_ID, DOMAIN_THEMES } from "./domain-themes";
import type { DomainThemeId } from "./domain-themes";

// Deterministic route -> theme resolution.
//
// One map, one pure function, matched by longest prefix. No page is ever
// duplicated to apply styling, no route wrapper carries a theme prop, and
// an unrecognised path resolves to Home Base rather than rendering
// unthemed - so a new or mistyped route degrades to a coherent look
// instead of a broken one.
//
// Pathname-based, therefore identical in the browser and in the Tauri
// desktop build (both run the same Next.js client router), and unaffected
// by deep links or a hard refresh: the pathname is all it reads.

// Every key is a REAL route in this repo - verified against app/(app)'s
// page.tsx files. Routes deliberately left out (/quests, /goals,
// /calendar, /planning, /notes, /chronicle, /character, /rewards,
// /challenges, /jarvis, /settings, /attributes/*) are cross-cutting Atlas
// systems rather than life domains; they inherit Home Base, which is the
// correct answer for them, not an oversight.
const ROUTE_THEMES: ReadonlyArray<Readonly<{ prefix: string; theme: DomainThemeId }>> = [
  { prefix: "/workouts", theme: "calisthenics" },
  { prefix: "/library", theme: "reading" },
  { prefix: "/career-hub", theme: "career" },
  { prefix: "/thesis-hub", theme: "thesis" },
  // Outside/Walking lives on the existing World Map - real geographic
  // exploration over real travel data, which is exactly the brief's
  // "atmospheric landscapes, movement and discovery", rather than a
  // second, empty page with the same intent.
  { prefix: "/world-map", theme: "exploration" },
];

// Longest prefix wins, so a future "/career-hub/interviews" with its own
// theme would beat the "/career-hub" entry regardless of declaration order.
const ROUTE_THEMES_BY_SPECIFICITY = [...ROUTE_THEMES].sort((first, second) => second.prefix.length - first.prefix.length);

function normalizePathname(pathname: string): string {
  if (!pathname || !pathname.startsWith("/")) return "/";

  // Trailing slashes and query/hash fragments must not change the theme -
  // "/library/" and "/library" are the same page to the user.
  const withoutQuery = pathname.split(/[?#]/)[0];
  return withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, "") : "/";
}

export function resolveDomainThemeId(pathname: string): DomainThemeId {
  const normalized = normalizePathname(pathname);

  const match = ROUTE_THEMES_BY_SPECIFICITY.find((entry) => normalized === entry.prefix || normalized.startsWith(`${entry.prefix}/`));

  return match ? match.theme : DEFAULT_DOMAIN_THEME_ID;
}

export function resolveDomainTheme(pathname: string) {
  return DOMAIN_THEMES[resolveDomainThemeId(pathname)];
}

// Which themes a real route can actually reach today. Exported so the
// tests can assert that every themed route points at a theme flagged
// hasPage, and that no theme claims a page it does not have.
export const THEMED_ROUTE_PREFIXES: ReadonlyArray<string> = ROUTE_THEMES.map((entry) => entry.prefix);
