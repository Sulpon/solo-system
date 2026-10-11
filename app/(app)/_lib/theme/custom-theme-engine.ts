import { DEFAULT_DOMAIN_THEME_ID, DOMAIN_THEMES } from "./domain-themes";
import { resolveDomainTheme } from "./route-theme";
import type { DomainTheme, DomainThemeId, DomainThemeTokens } from "./domain-themes";
import type { CustomTheme, PageThemeSettings } from "../types/custom-theme";

// Custom themes, and pinning any theme to a page.
//
// Pure. Everything the UI needs is computed from the settings it is given,
// so resolution is testable without a browser and identical in the Tauri
// build.

// A theme after resolution, which may or may not be one of the built-ins.
// DomainThemeId stays a closed union - widening it would cost type safety
// everywhere for the sake of ids only this module creates.
export type ResolvedTheme = Readonly<Omit<DomainTheme, "id"> & { id: string; isCustom: boolean }>;

export const CUSTOM_THEME_PREFIX = "custom-";

export function isCustomThemeId(id: string): boolean {
  return id.startsWith(CUSTOM_THEME_PREFIX);
}

export function createCustomThemeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${CUSTOM_THEME_PREFIX}${crypto.randomUUID()}`;
  }

  return `${CUSTOM_THEME_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// "167 139 250" - the --menace-accent convention, so `rgb(var(--atlas-accent) / 0.4)`
// keeps working. Anything else is rejected rather than written into CSS,
// where it would silently break every surface at once.
const RGB_TRIPLET = /^\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*$/;

export function parseRgbTriplet(value: string): [number, number, number] | null {
  const match = RGB_TRIPLET.exec(value);

  if (!match) {
    return null;
  }

  const channels = [Number(match[1]), Number(match[2]), Number(match[3])] as [number, number, number];
  return channels.every((channel) => channel >= 0 && channel <= 255) ? channels : null;
}

export function hexToRgbTriplet(hex: string): string | null {
  const cleaned = hex.trim().replace(/^#/, "");
  const full = cleaned.length === 3 ? cleaned.split("").map((character) => character + character).join("") : cleaned;

  if (!/^[0-9a-f]{6}$/i.test(full)) {
    return null;
  }

  return `${parseInt(full.slice(0, 2), 16)} ${parseInt(full.slice(2, 4), 16)} ${parseInt(full.slice(4, 6), 16)}`;
}

export function rgbTripletToHex(value: string): string {
  const parsed = parseRgbTriplet(value);

  if (!parsed) {
    return "#000000";
  }

  return `#${parsed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

// The glow is the accent at low opacity, so it has to follow the accent
// rather than keep the base theme's colour and clash with it.
export function deriveGlow(accent: string): string {
  const parsed = parseRgbTriplet(accent);
  return parsed ? `0 0 60px rgba(${parsed[0]}, ${parsed[1]}, ${parsed[2]}, 0.16)` : "0 0 60px rgba(0, 0, 0, 0)";
}

export type CustomThemeDraft = Readonly<{
  label: string;
  tagline: string;
  baseThemeId: DomainThemeId;
  accent: string;
  surface: string;
  border: string;
  muted: string;
  motion: DomainTheme["motion"];
  display: DomainTheme["display"];
}>;

export function draftFromTheme(base: DomainTheme): CustomThemeDraft {
  return {
    label: `${base.label} (copy)`,
    tagline: base.tagline,
    baseThemeId: base.id,
    accent: base.tokens.accent,
    surface: base.tokens.surface,
    border: base.tokens.border,
    muted: base.tokens.muted,
    motion: base.motion,
    display: base.display,
  };
}

// Tokens the editor does not expose - the ambient wash, the decorative
// motif - are inherited from the base theme rather than invented, so a
// custom theme always has a coherent atmosphere behind it.
export function tokensFromDraft(draft: CustomThemeDraft): DomainThemeTokens {
  const base = DOMAIN_THEMES[draft.baseThemeId] ?? DOMAIN_THEMES[DEFAULT_DOMAIN_THEME_ID];

  return {
    accent: draft.accent,
    accentSoft: base.tokens.accentSoft,
    ambient: base.tokens.ambient,
    decor: base.tokens.decor,
    decorOpacity: base.tokens.decorOpacity,
    surface: draft.surface,
    border: draft.border,
    glow: deriveGlow(draft.accent),
    muted: draft.muted,
  };
}

export type DraftProblem = Readonly<{ field: keyof CustomThemeDraft; message: string }>;

export function validateDraft(draft: CustomThemeDraft): DraftProblem[] {
  const problems: DraftProblem[] = [];

  if (!draft.label.trim()) {
    problems.push({ field: "label", message: "Give the theme a name." });
  }

  if (!parseRgbTriplet(draft.accent)) {
    problems.push({ field: "accent", message: "Accent must be three numbers 0-255, e.g. 167 139 250." });
  }

  for (const field of ["surface", "border", "muted"] as const) {
    if (!draft[field].trim()) {
      problems.push({ field, message: "This cannot be empty." });
    }
  }

  return problems;
}

export function buildCustomTheme(draft: CustomThemeDraft, existing: CustomTheme | null, now = new Date().toISOString()): CustomTheme {
  return {
    id: existing?.id ?? createCustomThemeId(),
    label: draft.label.trim(),
    tagline: draft.tagline.trim(),
    baseThemeId: draft.baseThemeId,
    motion: draft.motion,
    display: draft.display,
    tokens: tokensFromDraft(draft),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function upsertCustomTheme(settings: PageThemeSettings, theme: CustomTheme): PageThemeSettings {
  const exists = settings.customThemes.some((entry) => entry.id === theme.id);

  return {
    ...settings,
    customThemes: exists ? settings.customThemes.map((entry) => (entry.id === theme.id ? theme : entry)) : [...settings.customThemes, theme],
  };
}

// Deleting a theme also releases the pages pinned to it, so no page is
// left pointing at something that no longer exists.
export function deleteCustomTheme(settings: PageThemeSettings, themeId: string): PageThemeSettings {
  const routeThemes = Object.fromEntries(Object.entries(settings.routeThemes).filter(([, id]) => id !== themeId));

  return { customThemes: settings.customThemes.filter((entry) => entry.id !== themeId), routeThemes };
}

// Passing null clears the override, handing the page back to the built-in
// route map rather than freezing it on whatever it currently shows.
export function assignRouteTheme(settings: PageThemeSettings, prefix: string, themeId: string | null): PageThemeSettings {
  const routeThemes = { ...settings.routeThemes };

  if (themeId === null) {
    delete routeThemes[prefix];
  } else {
    routeThemes[prefix] = themeId;
  }

  return { ...settings, routeThemes };
}

function asResolved(theme: DomainTheme): ResolvedTheme {
  return { ...theme, isCustom: false };
}

export function materialiseCustomTheme(theme: CustomTheme): ResolvedTheme {
  const base = DOMAIN_THEMES[theme.baseThemeId as DomainThemeId] ?? DOMAIN_THEMES[DEFAULT_DOMAIN_THEME_ID];

  return {
    id: theme.id,
    label: theme.label,
    tagline: theme.tagline,
    motion: theme.motion,
    display: theme.display,
    captureDomain: base.captureDomain,
    hasPage: true,
    tokens: theme.tokens,
    isCustom: true,
  };
}

function normalizePathname(pathname: string): string {
  if (!pathname || !pathname.startsWith("/")) {
    return "/";
  }

  const withoutQuery = pathname.split(/[?#]/)[0];
  return withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, "") : "/";
}

export function findThemeById(settings: PageThemeSettings, themeId: string): ResolvedTheme | null {
  const custom = settings.customThemes.find((entry) => entry.id === themeId);

  if (custom) {
    return materialiseCustomTheme(custom);
  }

  const builtIn = DOMAIN_THEMES[themeId as DomainThemeId];
  return builtIn ? asResolved(builtIn) : null;
}

// A page's theme: the user's own choice first, longest prefix wins, then
// the built-in route map. An override naming a theme that no longer
// exists is ignored rather than rendering the page unthemed.
export function resolveThemeFor(pathname: string, settings: PageThemeSettings): ResolvedTheme {
  const normalized = normalizePathname(pathname);

  const matches = Object.keys(settings.routeThemes)
    .filter((prefix) => (prefix === "/" ? normalized === "/" : normalized === prefix || normalized.startsWith(`${prefix}/`)))
    .sort((first, second) => second.length - first.length);

  for (const prefix of matches) {
    const found = findThemeById(settings, settings.routeThemes[prefix]);

    if (found) {
      return found;
    }
  }

  return asResolved(resolveDomainTheme(normalized));
}
