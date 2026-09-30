import ThemeDecorativeLayer from "./ThemeDecorativeLayer";

// The page atmosphere: the domain's ambient wash plus its motif, fixed
// behind everything.
//
// Mounted ONCE, by AppShell, as a fixed sibling of <main> - never as a
// wrapper around {children}. Wrapping would put a new stacking/scroll
// container between the shell and pages that own their own drag contexts
// (Dashboard's dnd-kit grid, Attributes' CustomizablePage reorder), which
// is exactly the kind of invisible regression a visual change must not
// introduce.
export default function ThemeBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="atlas-themed atlas-ambient-fade absolute inset-0" />
      <ThemeDecorativeLayer />
      {/* Keeps the lower half of long pages legible: the ambient wash is
          concentrated at the top, so content further down would otherwise
          sit on a flat field with no depth. */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
    </div>
  );
}
