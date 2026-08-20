"use client";

type ProgressLineChartPoint = Readonly<{ date: string; value: number }>;

type ProgressLineChartProps = Readonly<{
  points: ReadonlyArray<ProgressLineChartPoint>;
  formatValue?: (value: number) => string;
  emptyText?: string;
}>;

export default function ProgressLineChart({ points, formatValue = (value) => value.toLocaleString(), emptyText = "Not enough data yet." }: ProgressLineChartProps) {
  if (points.length === 0) {
    return <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-500">{emptyText}</div>;
  }

  if (points.length === 1) {
    return (
      <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-950/60">
        <p className="text-2xl font-black text-white">{formatValue(points[0].value)}</p>
        <p className="mt-1 text-xs text-slate-500">{new Date(points[0].date).toLocaleDateString()}</p>
        <p className="mt-2 text-xs text-slate-600">Log another session to see a trend.</p>
      </div>
    );
  }

  const values = points.map((point) => point.value);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values, 0);
  const range = Math.max(1, maxValue - minValue);

  const coords = points.map((point, index) => ({
    x: (index / (points.length - 1)) * 100,
    y: 100 - ((point.value - minValue) / range) * 100,
    point,
  }));

  const polylinePoints = coords.map((coord) => `${coord.x},${coord.y}`).join(" ");
  const areaPoints = `0,100 ${polylinePoints} 100,100`;

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{formatValue(maxValue)}</span>
        <span>{formatValue(minValue)}</span>
      </div>
      <svg viewBox="0 0 100 100" className="mt-2 h-40 w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
        <polygon points={areaPoints} className="fill-purple-500/10" />
        <polyline points={polylinePoints} className="fill-none stroke-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        {coords.map((coord, index) => (
          <circle key={index} cx={coord.x} cy={coord.y} r="2.2" vectorEffect="non-scaling-stroke" className="fill-cyan-300">
            <title>{`${new Date(coord.point.date).toLocaleDateString()}: ${formatValue(coord.point.value)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-slate-600">
        <span>{new Date(points[0].date).toLocaleDateString()}</span>
        <span>{new Date(points[points.length - 1].date).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
