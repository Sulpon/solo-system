"use client";

import { usePathname } from "next/navigation";
import { resolveEnvironment, environmentSrc } from "../theme/environments";
import { useDomainTheme } from "./useDomainTheme";
import { useEnvironmentImage } from "./useEnvironmentImage";
import { usePageWallpaper } from "./usePageWallpaper";
import type { Environment } from "../theme/environments";
import type { Wallpaper } from "../types/custom-theme";

export type PageBackdrop =
  | Readonly<{ kind: "wallpaper"; wallpaper: Wallpaper }>
  | Readonly<{ kind: "environment"; environment: Environment; src: string }>
  | null;

// What is actually behind this page, if anything.
//
// A wallpaper the user pinned beats the domain's stock environment, and
// an environment whose file is not present resolves to nothing at all -
// so an empty environments folder leaves every page exactly as it was.
//
// Both the layer that draws the backdrop and the shell that has to give
// itself a stacking context for it read THIS, so they can never disagree
// about whether something is there.
export function usePageBackdrop(): PageBackdrop {
  const pathname = usePathname();
  const wallpaper = usePageWallpaper();
  const theme = useDomainTheme();

  const environment = resolveEnvironment(pathname ?? "/", theme.id);
  const src = environment ? environmentSrc(environment) : null;
  // Probed even when a wallpaper wins, so the hook order never changes.
  const state = useEnvironmentImage(wallpaper ? null : src);

  if (wallpaper) {
    return { kind: "wallpaper", wallpaper };
  }

  return environment && src && state === "ready" ? { kind: "environment", environment, src } : null;
}
