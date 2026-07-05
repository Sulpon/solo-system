"use client";

import Card from "../Card";
import SectionTitle from "../SectionTitle";
import type { getRecentGoalMilestones } from "./dashboard-overview.utils";

type RecentMilestonesCardProps = Readonly<{
  milestones: ReturnType<typeof getRecentGoalMilestones>;
}>;

export default function RecentMilestonesCard({ milestones }: RecentMilestonesCardProps) {
  return (
    <Card className="p-5">
      <SectionTitle eyebrow="Recent Milestones" title="Completed events" accentClass="text-purple-300" />
      <div className="mt-5 space-y-3">
        {milestones.length > 0 ? (
          milestones.map((milestone) => (
            <div key={milestone.title + milestone.date} className="rounded-xl border border-slate-800/80 bg-slate-950/45 p-4">
              <div className="flex items-start gap-3">
                <div className={"mt-0.5 h-3 w-3 rounded-full bg-current " + milestone.accent} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{milestone.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{milestone.subtitle}</p>
                </div>
                <span className="ml-auto shrink-0 text-xs text-slate-500">{milestone.date}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-5 text-sm text-slate-400">
            Completed goal events will appear here after you make progress.
          </div>
        )}
      </div>
    </Card>
  );
}
