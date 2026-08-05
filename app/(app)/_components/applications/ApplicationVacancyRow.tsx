"use client";

import Link from "next/link";
import type { VacancyEntry } from "../../_lib/types/vacancy";

export const APPLICATION_ROW_GRID_CLASS =
  "grid grid-cols-[minmax(180px,1.5fr)_minmax(140px,1fr)_minmax(120px,0.9fr)_70px_110px_minmax(160px,1.3fr)] items-center gap-3 px-5 py-3";

type ApplicationVacancyRowProps = Readonly<{
  vacancy: VacancyEntry;
  companyName: string;
}>;

export default function ApplicationVacancyRow({ vacancy, companyName }: ApplicationVacancyRowProps) {
  return (
    <Link
      href={`/career-hub/companies/${vacancy.companyId}/vacancies/${vacancy.id}`}
      className={APPLICATION_ROW_GRID_CLASS + " border-b border-slate-800/60 text-sm text-slate-200 last:border-b-0 hover:bg-slate-900/40"}
    >
      <div className="min-w-0 truncate font-semibold text-white">{vacancy.positionName || "Untitled Vacancy"}</div>
      <div className="truncate text-slate-400">{companyName}</div>
      <div className="truncate text-slate-400">{vacancy.location || "—"}</div>
      <div className="text-slate-400">{typeof vacancy.fitRating === "number" ? `${vacancy.fitRating}/10` : "—"}</div>
      <div className="text-slate-400">{vacancy.applicationDate || "—"}</div>
      <div className="truncate text-slate-400">{vacancy.nextAction || "—"}</div>
    </Link>
  );
}
