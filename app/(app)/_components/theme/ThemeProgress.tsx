import Progress from "../Progress";

type ThemeProgressProps = Readonly<{
  value: number;
  max: number;
  label?: string;
  // Caller-formatted, e.g. "12 / 30 sessions". Left out entirely rather
  // than defaulting to a percentage, because a percentage of an invented
  // target is a fabricated number.
  valueLabel?: string;
  className?: string;
}>;

// Wraps the existing Progress primitive rather than reimplementing it, so
// the ring, transition and .menace-progress-fill glow stay identical
// everywhere. The only thing this adds is the domain accent - which
// Progress already inherits through --menace-accent, so the fill colour
// below is the domain's without any per-page class.
export default function ThemeProgress({ value, max, label, valueLabel, className = "" }: ThemeProgressProps) {
  return (
    <div className={className}>
      {label || valueLabel ? (
        <div className="mb-2 flex items-baseline justify-between gap-3 text-xs">
          {label ? <span className="atlas-muted font-semibold uppercase tracking-[0.18em]">{label}</span> : null}
          {valueLabel ? <span className="atlas-display font-semibold text-white">{valueLabel}</span> : null}
        </div>
      ) : null}

      <Progress
        value={value}
        max={max}
        className="h-2 overflow-hidden rounded-full bg-white/5"
        fillClassName="h-full rounded-full bg-[rgb(var(--atlas-accent,var(--menace-accent,168_85_247)))]"
      />
    </div>
  );
}
