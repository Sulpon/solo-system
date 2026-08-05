"use client";

import type { VacancyEntry } from "../../_lib/types/vacancy";
import ApplicationVacancyRow, { APPLICATION_ROW_GRID_CLASS } from "./ApplicationVacancyRow";

type ApplicationVacancyTableProps = Readonly<{
  vacancies: ReadonlyArray<VacancyEntry>;
  companyNames: ReadonlyMap<string, string>;
  emptyLabel: string;
}>;

export default function ApplicationVacancyTable({ vacancies, companyNames, emptyLabel }: ApplicationVacancyTableProps) {
  if (vacancies.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center">
        <h3 className="text-lg font-bold text-white">No vacancies here</h3>
        <p className="mt-2 text-sm text-slate-400">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-slate-800/90 bg-slate-950/45 shadow-[0_0_30px_rgba(15,23,42,0.25)]">
      <div className="overflow-x-auto rounded-2xl">
        <div className="min-w-[960px]">
          <div className={APPLICATION_ROW_GRID_CLASS + " border-b border-slate-800/80 bg-slate-950/80 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"}>
            <div>Position</div>
            <div>Company</div>
            <div>Location</div>
            <div>Fit</div>
            <div>Date</div>
            <div>Next Action</div>
          </div>

          {vacancies.map((vacancy) => (
            <ApplicationVacancyRow key={vacancy.id} vacancy={vacancy} companyName={companyNames.get(vacancy.companyId) ?? "Unknown Company"} />
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-2xl bg-gradient-to-l from-slate-950/90 to-transparent" aria-hidden="true" />
      <p className="pointer-events-none absolute bottom-2 right-3 text-[10px] uppercase tracking-[0.16em] text-slate-500">Scroll for more →</p>
    </div>
  );
}
