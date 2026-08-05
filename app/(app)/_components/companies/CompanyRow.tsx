"use client";

import Link from "next/link";
import type { CompanyEntry } from "../../_lib/types/company-database";
import type { VacancyStatus } from "../../_lib/types/vacancy";

export type CompanyVacancySummary = Readonly<{ count: number; bestStatus: VacancyStatus | null }>;

type CompanyRowProps = Readonly<{
  entry: CompanyEntry;
  vacancySummary: CompanyVacancySummary | null;
  onDelete: (entryId: string) => void;
}>;

export const COMPANY_ROW_GRID_CLASS = "grid grid-cols-[minmax(200px,1.6fr)_120px_minmax(160px,1fr)_minmax(170px,1fr)_90px] items-center gap-2 px-5 py-3";

const statusAccent: Record<string, string> = {
  Interested: "border-slate-700 bg-slate-800/60 text-slate-300",
  Preparing: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
  Applied: "border-blue-500/40 bg-blue-500/10 text-blue-200",
  Interview: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  Offer: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  Rejected: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  Closed: "border-slate-800 bg-slate-900/50 text-slate-500",
};

export default function CompanyRow({ entry, vacancySummary, onDelete }: CompanyRowProps) {
  return (
    <Link
      href={`/career-hub/companies/${entry.id}`}
      className={COMPANY_ROW_GRID_CLASS + " border-b border-slate-800/60 text-sm text-slate-200 last:border-b-0 hover:bg-slate-900/40"}
    >
      <div className="min-w-0">
        <p className="truncate font-semibold text-white">{entry.name}</p>
        {entry.city ? <p className="truncate text-xs text-slate-500">{entry.city}</p> : null}
      </div>
      <div className="truncate text-slate-400">{entry.country || "—"}</div>
      <div className="truncate text-slate-400">{entry.industry || "—"}</div>
      <div>
        {vacancySummary && vacancySummary.count > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-300">
            {vacancySummary.count} vacanc{vacancySummary.count === 1 ? "y" : "ies"}
            {vacancySummary.bestStatus ? (
              <span className={"rounded-lg border px-2 py-0.5 text-xs font-semibold " + (statusAccent[vacancySummary.bestStatus] ?? statusAccent.Interested)}>
                {vacancySummary.bestStatus}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-xs text-slate-600">No vacancies yet</span>
        )}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete(entry.id);
          }}
          className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-rose-300 transition hover:border-rose-400/60"
        >
          Delete
        </button>
      </div>
    </Link>
  );
}
