"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { resolveWallpaperFor } from "../theme/custom-theme-engine";
import { usePageThemes } from "./usePageThemes";
import type { Wallpaper } from "../types/custom-theme";

// The picture behind the current page, or null.
//
// One hook for both readers - PageWallpaper, which draws it, and AppShell,
// which has to give the shell its own stacking context while one is shown.
// Resolving it in two places would let the two disagree.
export function usePageWallpaper(): Wallpaper | null {
  const pathname = usePathname();
  const { settings } = usePageThemes();

  return useMemo(() => resolveWallpaperFor(pathname ?? "/", settings), [pathname, settings]);
}
