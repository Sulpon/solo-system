"use client";

import type { CompanyEntry } from "../../_lib/types/company-database";
import CompanyRow, { COMPANY_ROW_GRID_CLASS, type CompanyVacancySummary } from "./CompanyRow";

export type CompanyGroup = Readonly<{
  key: string;
  label: string | null;
  entries: ReadonlyArray<CompanyEntry>;
}>;

type CompanyTableProps = Readonly<{
  groups: ReadonlyArray<CompanyGroup>;
  vacancySummaries: ReadonlyMap<string, CompanyVacancySummary>;
  onDelete: (entryId: string) => void;
}>;

export default function CompanyTable({ groups, vacancySummaries, onDelete }: CompanyTableProps) {
  const hasAnyEntries = groups.some((group) => group.entries.length > 0);

  if (!hasAnyEntries) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center">
        <h3 className="text-lg font-bold text-white">No companies match these filters</h3>
        <p className="mt-2 text-sm text-slate-400">Adjust your filters, or add / import companies to get started.</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-slate-800/90 bg-slate-950/45 shadow-[0_0_30px_rgba(15,23,42,0.25)]">
      <div className="overflow-x-auto rounded-2xl">
        <div className="min-w-[900px]">
          <div className={COMPANY_ROW_GRID_CLASS + " border-b border-slate-800/80 bg-slate-950/80 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"}>
            <div>Company</div>
            <div>Country</div>
            <div>Industry</div>
            <div>Vacancies</div>
            <div className="text-right">Actions</div>
          </div>

          {groups.map((group) =>
            group.entries.length === 0 ? null : (
              <div key={group.key}>
                {group.label ? (
                  <div className="border-b border-slate-800/60 bg-slate-950/70 px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {group.label} · {group.entries.length}
                  </div>
                ) : null}
                {group.entries.map((entry) => (
                  <CompanyRow key={entry.id} entry={entry} vacancySummary={vacancySummaries.get(entry.id) ?? null} onDelete={onDelete} />
                ))}
              </div>
            ),
          )}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-2xl bg-gradient-to-l from-slate-950/90 to-transparent" aria-hidden="true" />
      <p className="pointer-events-none absolute bottom-2 right-3 text-[10px] uppercase tracking-[0.16em] text-slate-500">Scroll for more →</p>
    </div>
  );
}
