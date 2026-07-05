"use client";

import Link from "next/link";
import Card from "../Card";
import Progress from "../Progress";
import type { getLiveDreamProgress } from "./dashboard-overview.utils";

type DreamProgressCardProps = Readonly<{
  dreams: ReturnType<typeof getLiveDreamProgress>;
}>;

export default function DreamProgressCard({ dreams }: DreamProgressCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Dream Progress</p>
          <h2 className="mt-1 text-xl font-black text-white">Long-term system status</h2>
        </div>
        <Link href="/goals" className="rounded-full border border-slate-700 bg-slate-950/55 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-purple-400/50 hover:text-white">
          View Goals
        </Link>
      </div>

      <div className="mt-5 space-y-4">
        {dreams.length > 0 ? (
          dreams.map((dream, index) => (
            <div key={dream.id} className="rounded-xl border border-slate-800/80 bg-slate-950/45 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{dream.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{dream.subtitle}</p>
                </div>
                <span className={"shrink-0 text-sm font-semibold " + (index === 0 ? "text-purple-200" : "text-cyan-200")}>{dream.progress}%</span>
              </div>
              <div className="mt-3">
                <Progress
                  value={dream.progress}
                  max={100}
                  className="h-2.5 overflow-hidden rounded-full bg-slate-950/80"
                  fillClassName={index === 0 ? "h-full bg-gradient-to-r from-purple-500 to-fuchsia-400" : "h-full bg-gradient-to-r from-cyan-400 to-emerald-400"}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-5 text-sm text-slate-400">
            Create your first dream in Goal Tree to start tracking long-term progress.
          </div>
        )}
      </div>
    </Card>
  );
}
