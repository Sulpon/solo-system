"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { resolveDomainTheme } from "../theme/route-theme";
import { domainThemeStyle } from "../theme/domain-themes";
import type { DomainTheme } from "../theme/domain-themes";

// The one place a component asks "which domain am I in?". Everything else
// reads the CSS variables AppShell already applied, so a themed component
// does not need this hook just to look right - only components that make a
// real DECISION from the theme (a header's tagline, a decorative motif's
// shape) should call it.
export function useDomainTheme(): DomainTheme {
  const pathname = usePathname();

  return useMemo(() => resolveDomainTheme(pathname ?? "/"), [pathname]);
}

// Used by AppShell to apply the domain's variables once, at the root.
export function useDomainThemeStyle() {
  const theme = useDomainTheme();

  return useMemo(() => ({ theme, style: domainThemeStyle(theme) }), [theme]);
}
