"use client";

type ChallengeStreakDotsProps = Readonly<{ current: number; required: number }>;

// Minimal filled/outline dots - deliberately not fire emojis or badges, to
// keep the progression indicator subtle rather than gamified.
export default function ChallengeStreakDots({ current, required }: ChallengeStreakDotsProps) {
  const filled = Math.max(0, Math.min(current, required));

  return (
    <span className="flex items-center gap-1" aria-label={`Streak ${current} of ${required}`}>
      {Array.from({ length: required }, (_, index) => (
        <span key={index} className={"h-2 w-2 rounded-full border " + (index < filled ? "border-amber-400 bg-amber-400" : "border-slate-700 bg-transparent")} />
      ))}
    </span>
  );
}
