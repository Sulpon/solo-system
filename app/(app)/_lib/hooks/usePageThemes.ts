"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { assignRouteTheme, buildCustomTheme, deleteCustomTheme, upsertCustomTheme, type CustomThemeDraft } from "../theme/custom-theme-engine";
import { EMPTY_PAGE_THEME_SETTINGS, type CustomTheme, type PageThemeSettings } from "../types/custom-theme";

// The user's own themes and which page each one is pinned to.
//
// Every mutation goes through the pure helpers in custom-theme-engine, so
// the rules (an id survives an edit, deleting a theme releases its pages,
// clearing an assignment hands the page back to the route map) are tested
// without a browser and cannot drift between callers.
export function usePageThemes() {
  const [settings, setSettings, hasLoaded] = useLocalStorageState<PageThemeSettings>(STORAGE_KEYS.pageThemes, EMPTY_PAGE_THEME_SETTINGS);

  // Stored settings predate nothing yet, but a partial object from a
  // half-written sync would still take the UI down without this.
  const safe: PageThemeSettings = {
    customThemes: Array.isArray(settings?.customThemes) ? settings.customThemes : [],
    routeThemes: settings?.routeThemes && typeof settings.routeThemes === "object" ? settings.routeThemes : {},
  };

  const saveTheme = useCallback(
    (draft: CustomThemeDraft, existing: CustomTheme | null) => {
      const theme = buildCustomTheme(draft, existing);
      setSettings((current) => upsertCustomTheme(current ?? EMPTY_PAGE_THEME_SETTINGS, theme));
      return theme;
    },
    [setSettings],
  );

  const removeTheme = useCallback(
    (themeId: string) => {
      setSettings((current) => deleteCustomTheme(current ?? EMPTY_PAGE_THEME_SETTINGS, themeId));
    },
    [setSettings],
  );

  const setPageTheme = useCallback(
    (prefix: string, themeId: string | null) => {
      setSettings((current) => assignRouteTheme(current ?? EMPTY_PAGE_THEME_SETTINGS, prefix, themeId));
    },
    [setSettings],
  );

  return { settings: safe, hasLoaded, saveTheme, removeTheme, setPageTheme } as const;
}
