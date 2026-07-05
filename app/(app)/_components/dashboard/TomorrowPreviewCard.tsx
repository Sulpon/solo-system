"use client";

import Card from "../Card";

type TomorrowPreviewCardProps = Readonly<{
  coreQuestCount: number;
  estimatedXp: number;
}>;

export default function TomorrowPreviewCard({ coreQuestCount, estimatedXp }: TomorrowPreviewCardProps) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Tomorrow Preview</p>
      <h2 className="mt-1 text-xl font-black text-white">Next reset</h2>
      {coreQuestCount > 0 ? (
        <div className="mt-5 grid gap-3">
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/45 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Core missions</p>
            <p className="mt-2 text-3xl font-black text-white">{coreQuestCount}</p>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/45 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Available core XP</p>
            <p className="mt-2 text-3xl font-black text-white">{estimatedXp.toLocaleString()}</p>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-5 text-sm text-slate-400">
          No core daily quests yet. Create one in Quests to define tomorrow&apos;s minimum successful day.
        </div>
      )}
    </Card>
  );
}
