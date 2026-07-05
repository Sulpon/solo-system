"use client";

export default function DailyProgressRing({ value }: Readonly<{ value: number }>) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-slate-950/70"
      style={{
        background: `conic-gradient(rgba(34,211,238,0.9) ${safeValue * 3.6}deg, rgba(15,23,42,0.86) 0deg)`,
      }}
      aria-label={`${safeValue}% complete`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-800 bg-slate-950 text-xl font-black text-white">
        {safeValue}%
      </div>
    </div>
  );
}
