type ThemeDecorativeLayerProps = Readonly<{
  // Extra positioning/masking classes. The motif itself always comes from
  // the active domain's --atlas-decor, never from the caller, so a page
  // cannot invent a look that is not in the registry.
  className?: string;
}>;

// The per-domain motif: contour lines outside, shelf spines in the
// Library, a chart grid in Trading. Purely decorative, so it is
// pointer-events-none and hidden from assistive technology - it must never
// intercept a click on the dnd-kit grid beneath it or be read aloud.
export default function ThemeDecorativeLayer({ className = "" }: ThemeDecorativeLayerProps) {
  return <div aria-hidden className={"atlas-decor pointer-events-none absolute inset-0 " + className} />;
}
