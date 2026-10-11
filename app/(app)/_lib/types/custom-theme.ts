import type { DomainDisplayFont, DomainMotion, DomainThemeTokens } from "../theme/domain-themes";

// A theme the user made, stored in exactly the shape the built-in domain
// themes already use.
//
// Same tokens, same motion and display choices - which is the whole point:
// every component is already keyed to the CSS variables those tokens emit,
// so a custom theme needs no component to know it exists.
export type CustomTheme = Readonly<{
  id: string;
  label: string;
  // Shown under a themed page's title. Optional for a custom theme - an
  // empty one simply shows nothing rather than inventing a line.
  tagline: string;
  // Which built-in theme its untouched tokens came from, so the editor can
  // say what it was based on and a future token can inherit a sane value.
  baseThemeId: string;
  motion: DomainMotion;
  display: DomainDisplayFont;
  tokens: DomainThemeTokens;
  createdAt: string;
  updatedAt: string;
}>;

export type PageThemeSettings = Readonly<{
  customThemes: ReadonlyArray<CustomTheme>;
  // Route prefix -> theme id. The id may name a built-in domain theme or a
  // custom one; resolution checks both, so reassigning a page to a stock
  // theme needs no special case.
  routeThemes: Readonly<Record<string, string>>;
}>;

export const EMPTY_PAGE_THEME_SETTINGS: PageThemeSettings = { customThemes: [], routeThemes: {} };

// The pages a theme can be pinned to. Every entry is a real route in this
// repo; a prefix covers its children, so /career-hub also themes
// /career-hub/applications unless that gets its own entry later.
export const THEMEABLE_PAGES: ReadonlyArray<Readonly<{ prefix: string; label: string }>> = [
  { prefix: "/", label: "Dashboard" },
  { prefix: "/planning", label: "Planning Studio" },
  { prefix: "/goals", label: "Goal Tree" },
  { prefix: "/quests", label: "Quests" },
  { prefix: "/calendar", label: "Calendar" },
  { prefix: "/notes", label: "Notes" },
  { prefix: "/library", label: "Library" },
  { prefix: "/challenges", label: "Challenges" },
  { prefix: "/chronicle", label: "Chronicle" },
  { prefix: "/character", label: "Character" },
  { prefix: "/rewards", label: "Rewards" },
  { prefix: "/workouts", label: "Workouts" },
  { prefix: "/world-map", label: "World Map" },
  { prefix: "/career-hub", label: "Career Hub" },
  { prefix: "/thesis-hub", label: "Thesis Hub" },
  { prefix: "/jarvis", label: "JARVIS" },
  { prefix: "/attributes", label: "Attributes" },
  { prefix: "/settings", label: "Settings" },
];
