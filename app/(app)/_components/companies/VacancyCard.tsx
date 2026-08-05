"use client";

import Link from "next/link";
import type { VacancyEntry } from "../../_lib/types/vacancy";

type VacancyCardProps = Readonly<{
  companyId: string;
  vacancy: VacancyEntry;
}>;

const statusAccent: Record<string, string> = {
  Interested: "border-slate-700 bg-slate-800/60 text-slate-300",
  Preparing: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
  Applied: "border-blue-500/40 bg-blue-500/10 text-blue-200",
  Interview: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  Offer: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  Rejected: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  Closed: "border-slate-800 bg-slate-900/50 text-slate-500",
};

export default function VacancyCard({ companyId, vacancy }: VacancyCardProps) {
  return (
    <Link
      href={`/career-hub/companies/${companyId}/vacancies/${vacancy.id}`}
      className="block rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-purple-400/50 hover:bg-slate-900/40"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate font-semibold text-white">{vacancy.positionName || "Untitled Vacancy"}</p>
        <span className={"shrink-0 rounded-lg border px-2 py-0.5 text-xs font-semibold " + (statusAccent[vacancy.status] ?? statusAccent.Interested)}>{vacancy.status}</span>
      </div>
      <p className="mt-1 truncate text-xs text-slate-500">{vacancy.location || "No location set"}</p>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span>{typeof vacancy.fitRating === "number" ? `Fit ${vacancy.fitRating}/10` : "Not rated"}</span>
        <span>{vacancy.applicationDeadline || "No deadline"}</span>
      </div>
    </Link>
  );
}
