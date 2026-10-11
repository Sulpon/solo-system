"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { domainThemeStyle } from "../theme/domain-themes";
import { resolveThemeFor, type ResolvedTheme } from "../theme/custom-theme-engine";
import { usePageThemes } from "./usePageThemes";

// The one place a component asks "which domain am I in?". Everything else
// reads the CSS variables AppShell already applied, so a themed component
// does not need this hook just to look right - only components that make a
// real DECISION from the theme (a header's tagline, a decorative motif's
// shape) should call it.
//
// Resolution now consults the user's own per-page assignments first and
// falls back to the built-in route map, so a page someone has themed keeps
// their choice and every other page behaves exactly as before.
export function useDomainTheme(): ResolvedTheme {
  const pathname = usePathname();
  const { settings } = usePageThemes();

  return useMemo(() => resolveThemeFor(pathname ?? "/", settings), [pathname, settings]);
}

// Used by AppShell to apply the domain's variables once, at the root.
export function useDomainThemeStyle() {
  const theme = useDomainTheme();

  return useMemo(() => ({ theme, style: domainThemeStyle(theme) }), [theme]);
}
