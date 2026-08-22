"use client";

type StreakDotsProps = Readonly<{ current: number; required: number }>;

// Minimal filled/outline dots - deliberately not fire emojis or badges, to
// keep the progression indicator subtle rather than gamified.
export default function StreakDots({ current, required }: StreakDotsProps) {
  const filled = Math.max(0, Math.min(current, required));

  return (
    <div className="flex items-center gap-1.5" aria-label={`Streak ${current} of ${required}`}>
      {Array.from({ length: required }, (_, index) => (
        <span
          key={index}
          className={"h-2.5 w-2.5 rounded-full border " + (index < filled ? "border-amber-400 bg-amber-400" : "border-slate-700 bg-transparent")}
        />
      ))}
      <span className="ml-1.5 text-xs font-semibold text-slate-400">
        {current} / {required}
      </span>
    </div>
  );
}
