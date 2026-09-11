"use client";

import { useAchievementMoments } from "../../_lib/hooks/useAchievementMoments";
import AchievementMomentCard from "../achievements/AchievementMomentCard";

// Step 10 - Mission Control integration. A small, capped list, never an
// achievement feed: at most MAX_SHOWN of the highest-significance recent
// moments (computeAchievementMoments already sorts by significance then
// recency), rendered null when there's nothing meaningful to show.
const MAX_SHOWN = 2;

export default function RecentAchievementsPanel() {
  const { moments } = useAchievementMoments();
  const shown = moments.slice(0, MAX_SHOWN);

  if (shown.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Recently Achieved</p>
      <div className="space-y-3">
        {shown.map((moment) => (
          <AchievementMomentCard key={moment.id} moment={moment} />
        ))}
      </div>
    </div>
  );
}
