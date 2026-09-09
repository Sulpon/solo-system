"use client";

type MediaStarsProps = Readonly<{
  rating?: number;
  onRate?: (rating: number | undefined) => void;
  size?: "sm" | "md";
}>;

// Read-only when onRate is omitted (used on cards); interactive when
// provided (used in the Detail Panel header - clicking the current rating's
// star again clears it, since "no rating" must stay reachable).
export default function MediaStars({ rating, onRate, size = "sm" }: MediaStarsProps) {
  const starClass = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";

  if (!rating && !onRate) {
    return null;
  }

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((value) => {
        const filled = (rating ?? 0) >= value;

        if (!onRate) {
          return (
            <svg key={value} viewBox="0 0 20 20" fill="currentColor" className={starClass + " " + (filled ? "text-amber-300" : "text-slate-700")}>
              <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.8L10 14.9l-5.2 2.62.99-5.8-4.21-4.1 5.82-.85L10 1.5z" />
            </svg>
          );
        }

        return (
          <button
            key={value}
            type="button"
            onClick={() => onRate(rating === value ? undefined : value)}
            aria-label={`Rate ${value} star${value === 1 ? "" : "s"}`}
            className={starClass + " transition hover:scale-110 " + (filled ? "text-amber-300" : "text-slate-700 hover:text-amber-400/60")}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className={starClass}>
              <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.8L10 14.9l-5.2 2.62.99-5.8-4.21-4.1 5.82-.85L10 1.5z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
