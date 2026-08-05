"use client";

import type { VacancyStatus } from "../../_lib/types/vacancy";

export const STATUS_ACCENT: Record<VacancyStatus, string> = {
  Interested: "border-slate-700 bg-slate-800/60 text-slate-300",
  Preparing: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
  Applied: "border-blue-500/40 bg-blue-500/10 text-blue-200",
  Interview: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  Offer: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  Rejected: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  Closed: "border-slate-800 bg-slate-900/50 text-slate-500",
};

type ApplicationStatusCardProps = Readonly<{
  status: VacancyStatus;
  count: number;
  active: boolean;
  onToggle: (status: VacancyStatus) => void;
}>;

export default function ApplicationStatusCard({ status, count, active, onToggle }: ApplicationStatusCardProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(status)}
      className={
        "rounded-2xl border px-4 py-4 text-left transition " +
        (active ? STATUS_ACCENT[status] + " ring-1 ring-inset ring-current" : "border-slate-800 bg-slate-950/45 text-slate-300 hover:border-purple-400/40 hover:bg-slate-900/40")
      }
    >
      <p className="text-3xl font-black text-white">{count}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em]">{status}</p>
    </button>
  );
}
