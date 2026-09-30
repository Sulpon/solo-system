type ThemeStatProps = Readonly<{
  label: string;
  // Already formatted by the caller from real data. Typed as a string (not
  // number | string) on purpose: formatting decisions - locale separators,
  // units, rounding - belong to the domain that owns the number, and a
  // stat tile must never be able to imply precision the source lacks.
  value: string;
  // Optional context, e.g. "last 7 days". Never a target or a projection.
  hint?: string;
  testId?: string;
}>;

// One real figure. There is deliberately no "loading" or "placeholder"
// variant: a caller with no data renders ThemeEmptyState instead of a
// tile showing a dash that reads like a measured zero.
export default function ThemeStat({ label, value, hint, testId }: ThemeStatProps) {
  return (
    <div data-testid={testId} className="atlas-surface rounded-xl border p-4">
      <p className="atlas-muted text-[0.65rem] font-semibold uppercase tracking-[0.2em]">{label}</p>
      <p className="atlas-display mt-2 text-2xl font-bold text-white">{value}</p>
      {hint ? <p className="atlas-muted mt-1 text-xs">{hint}</p> : null}
    </div>
  );
}
