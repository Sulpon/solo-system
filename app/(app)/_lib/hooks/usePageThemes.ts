"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import {
  addWallpaper,
  assignRouteTheme,
  assignRouteWallpaper,
  buildCustomTheme,
  clampBlur,
  clampDim,
  deleteCustomTheme,
  removeWallpaper,
  upsertCustomTheme,
  type CustomThemeDraft,
} from "../theme/custom-theme-engine";
import { deleteDocumentFile, putDocumentFile } from "../document-store";
import { createAttachmentId } from "../types/attachment";
import { DEFAULT_WALLPAPER_DIM } from "../types/custom-theme";
import { EMPTY_PAGE_THEME_SETTINGS, type CustomTheme, type PageThemeSettings, type Wallpaper } from "../types/custom-theme";

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
    wallpapers: Array.isArray(settings?.wallpapers) ? settings.wallpapers : [],
    routeWallpapers: settings?.routeWallpapers && typeof settings.routeWallpapers === "object" ? settings.routeWallpapers : {},
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

  // The bytes go to IndexedDB FIRST, so the metadata can never reference
  // a picture that failed to store. Same order the note composer uses.
  const uploadWallpaper = useCallback(
    async (file: File) => {
      const id = createAttachmentId("wallpaper");
      await putDocumentFile(id, file);

      const wallpaper: Wallpaper = {
        id,
        fileName: file.name,
        fileType: file.type || "image/*",
        fileSize: file.size,
        addedAt: new Date().toISOString(),
        fit: "cover",
        dim: DEFAULT_WALLPAPER_DIM,
        blur: 0,
      };

      setSettings((current) => addWallpaper(current ?? EMPTY_PAGE_THEME_SETTINGS, wallpaper));
      return wallpaper;
    },
    [setSettings],
  );

  const updateWallpaper = useCallback(
    (wallpaper: Wallpaper, changes: Partial<Pick<Wallpaper, "fit" | "dim" | "blur">>) => {
      const next: Wallpaper = {
        ...wallpaper,
        ...changes,
        dim: clampDim(changes.dim ?? wallpaper.dim),
        blur: clampBlur(changes.blur ?? wallpaper.blur),
      };

      setSettings((current) => addWallpaper(current ?? EMPTY_PAGE_THEME_SETTINGS, next));
    },
    [setSettings],
  );

  // Drops the blob as well as the metadata - an orphaned picture in
  // IndexedDB is invisible weight nobody can reach.
  const deleteWallpaper = useCallback(
    async (wallpaperId: string) => {
      await deleteDocumentFile(wallpaperId);
      setSettings((current) => removeWallpaper(current ?? EMPTY_PAGE_THEME_SETTINGS, wallpaperId));
    },
    [setSettings],
  );

  const setPageWallpaper = useCallback(
    (prefix: string, wallpaperId: string | null) => {
      setSettings((current) => assignRouteWallpaper(current ?? EMPTY_PAGE_THEME_SETTINGS, prefix, wallpaperId));
    },
    [setSettings],
  );

  return { settings: safe, hasLoaded, saveTheme, removeTheme, setPageTheme, uploadWallpaper, updateWallpaper, deleteWallpaper, setPageWallpaper } as const;
}
