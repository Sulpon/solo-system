"use client";

import Card from "../Card";
import type { GoalTreeFilterKey } from "./goal-tree-outline.types";

type GoalTreeSummaryCardsProps = Readonly<{
  dreams: number;
  goals: number;
  milestones: number;
  progressGoals: number;
  overallProgress: number;
  activeFilter: GoalTreeFilterKey;
  onSelectFilter: (filter: GoalTreeFilterKey) => void;
}>;

function SummaryGlyph({ type }: Readonly<{ type: "dream" | "goal" | "milestone" | "progress" }>) {
  const className = "h-4 w-4";

  switch (type) {
    case "dream":
      return (
        <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
          <path d="M8 1.5L13 8L8 14.5L3 8L8 1.5Z" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    case "goal":
      return (
        <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="8" cy="8" r="2" fill="currentColor" />
        </svg>
      );
    case "milestone":
      return (
        <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
          <path d="M3 12.5V3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M3 4.5H11L9.8 7L11 9.5H3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
          <path d="M2.5 12.5H13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <rect x="4" y="8.5" width="1.8" height="3" rx="0.6" fill="currentColor" />
          <rect x="7.1" y="6.5" width="1.8" height="5" rx="0.6" fill="currentColor" />
          <rect x="10.2" y="4.5" width="1.8" height="7" rx="0.6" fill="currentColor" />
        </svg>
      );
  }
}

function SummaryCard({
  title,
  value,
  subtitle,
  accent,
  type,
  active,
  onClick,
}: Readonly<{
  title: string;
  value: number | string;
  subtitle: string;
  accent: string;
  type: "dream" | "goal" | "milestone" | "progress";
  active: boolean;
  onClick: () => void;
}>) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card
        className={
          "overflow-hidden bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(2,6,23,0.92))] p-5 transition " +
          (active ? "border-purple-400/60 shadow-[0_0_28px_rgba(168,85,247,0.2)]" : "border-slate-800/80")
        }
      >
        <div className={"inline-flex h-10 w-10 items-center justify-center rounded-xl border " + accent}>
          <SummaryGlyph type={type} />
        </div>
        <p className="mt-4 text-sm font-medium text-slate-300">{title}</p>
        <p className="mt-2 text-4xl font-black text-white">{value}</p>
        <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      </Card>
    </button>
  );
}

function OverallProgressCard({
  value,
  active,
  onClick,
}: Readonly<{
  value: number;
  active: boolean;
  onClick: () => void;
}>) {
  const clamped = Math.max(0, Math.min(100, value));
  const ring = `conic-gradient(from 180deg, rgba(168,85,247,1) 0%, rgba(96,165,250,1) ${clamped}%, rgba(30,41,59,0.95) ${clamped}% 100%)`;

  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card
        className={
          "overflow-hidden bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(2,6,23,0.92))] p-5 transition " +
          (active ? "border-purple-400/60 shadow-[0_0_28px_rgba(168,85,247,0.2)]" : "border-slate-800/80")
        }
      >
        <div className="flex h-full flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-orange-400/25 bg-orange-400/10 text-orange-200">
              <SummaryGlyph type="progress" />
            </div>
            <span className={"rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] " + (active ? "border-purple-300/60 bg-purple-500/15 text-purple-100" : "border-slate-700 bg-slate-950/75 text-slate-400")}>
              Overall
            </span>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-300">Overall Progress</p>
              <p className="mt-2 text-4xl font-black text-white">{clamped}%</p>
            </div>
            <div className="relative h-[88px] w-[88px] shrink-0">
              <div className="absolute inset-0 rounded-full bg-slate-900/80" />
              <div className="absolute inset-0 rounded-full" style={{ backgroundImage: ring }} />
              <div className="absolute inset-[8px] rounded-full border border-slate-800/80 bg-slate-950/95" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">All goals</p>
                  <p className="text-lg font-bold text-white">{clamped}%</p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-500">Across all dreams</p>
        </div>
      </Card>
    </button>
  );
}

export default function GoalTreeSummaryCards({ dreams, goals, milestones, progressGoals, overallProgress, activeFilter, onSelectFilter }: GoalTreeSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <SummaryCard title="Dreams" value={dreams} subtitle="All time" accent="border-purple-400/30 bg-purple-500/10 text-purple-300" type="dream" active={activeFilter === "dreams"} onClick={() => onSelectFilter("dreams")} />
      <SummaryCard title="Goals" value={goals} subtitle="Active" accent="border-cyan-400/30 bg-cyan-400/10 text-cyan-200" type="goal" active={activeFilter === "goals"} onClick={() => onSelectFilter("goals")} />
      <SummaryCard title="Milestones" value={milestones} subtitle="Completed" accent="border-emerald-400/30 bg-emerald-400/10 text-emerald-200" type="milestone" active={activeFilter === "milestones"} onClick={() => onSelectFilter("milestones")} />
      <SummaryCard title="Progress Goals" value={progressGoals} subtitle="In progress" accent="border-orange-400/30 bg-orange-400/10 text-orange-200" type="progress" active={activeFilter === "progress_goals"} onClick={() => onSelectFilter("progress_goals")} />
      <OverallProgressCard value={overallProgress} active={activeFilter === "all"} onClick={() => onSelectFilter("all")} />
    </div>
  );
}
