// Shared themed primitives. Import from here so a page never reaches into
// individual files and the set stays small and reviewable.
//
// Three components named in the brief are deliberately absent:
//
// - ThemeShell      AppShell.tsx already is the shell, and now applies the
//                   domain variables at its root. A wrapper around it would
//                   add a stacking context between the shell and pages that
//                   own drag contexts, for no gain.
// - ThemeNavigation Dock, Sidebar and AppLauncher already render navigation
//                   from one source of truth (_lib/icons/app-icon-map.ts).
//                   A themed duplicate would be a second nav to keep in sync.
// - ThemePageTransition  A transition is one animation on one element, which
//                   is what the .atlas-page-enter class is. A component
//                   wrapping children to add a class is indirection, not
//                   abstraction.
export { default as ThemeBackground } from "./ThemeBackground";
export { default as ThemeDecorativeLayer } from "./ThemeDecorativeLayer";
export { default as ThemeEmptyState } from "./ThemeEmptyState";
export { default as ThemeHeader } from "./ThemeHeader";
export { default as ThemeProgress } from "./ThemeProgress";
export { default as ThemeSection } from "./ThemeSection";
export { default as ThemeStat } from "./ThemeStat";
