type ProgressProps = Readonly<{
  value: number;
  max?: number;
  className: string;
  fillClassName: string;
}>;

export default function Progress({
  value,
  max = 100,
  className,
  fillClassName,
}: ProgressProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div className={"ring-1 ring-white/5 " + className}>
      <div
        className={"menace-progress-fill shadow-[0_0_18px_rgba(168,85,247,0.55)] transition-all duration-300 " + fillClassName}
        style={{ width: String(percent) + "%" }}
      />
    </div>
  );
}
