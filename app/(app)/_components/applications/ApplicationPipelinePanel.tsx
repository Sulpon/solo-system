"use client";

import { useMemo, useState } from "react";
import Card from "../Card";
import { VACANCY_STATUSES, compareVacancyStatus } from "../../_lib/types/vacancy";
import type { VacancyEntry, VacancyStatus } from "../../_lib/types/vacancy";
import ApplicationStatusCard from "./ApplicationStatusCard";
import ApplicationVacancyTable from "./ApplicationVacancyTable";

type ApplicationPipelinePanelProps = Readonly<{
  vacancies: ReadonlyArray<VacancyEntry>;
  companyNames: ReadonlyMap<string, string>;
}>;

export default function ApplicationPipelinePanel({ vacancies, companyNames }: ApplicationPipelinePanelProps) {
  const [activeStatus, setActiveStatus] = useState<VacancyStatus | null>(null);

  const countsByStatus = useMemo(() => {
    const counts = new Map<VacancyStatus, number>(VACANCY_STATUSES.map((status) => [status, 0] as const));
    for (const vacancy of vacancies) {
      counts.set(vacancy.status, (counts.get(vacancy.status) ?? 0) + 1);
    }
    return counts;
  }, [vacancies]);

  const visibleVacancies = useMemo(() => {
    const filtered = activeStatus ? vacancies.filter((vacancy) => vacancy.status === activeStatus) : vacancies;
    return [...filtered].sort(
      (first, second) => compareVacancyStatus(first.status, second.status) || first.positionName.localeCompare(second.positionName),
    );
  }, [vacancies, activeStatus]);

  function toggleStatus(status: VacancyStatus) {
    setActiveStatus((current) => (current === status ? null : status));
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Pipeline</p>
          {activeStatus ? (
            <button type="button" onClick={() => setActiveStatus(null)} className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 transition hover:text-purple-300">
              Clear filter ×
            </button>
          ) : null}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {VACANCY_STATUSES.map((status) => (
            <ApplicationStatusCard key={status} status={status} count={countsByStatus.get(status) ?? 0} active={activeStatus === status} onToggle={toggleStatus} />
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">{activeStatus ? `${activeStatus} Vacancies` : "All Vacancies"}</p>
        <div className="mt-4">
          <ApplicationVacancyTable
            vacancies={visibleVacancies}
            companyNames={companyNames}
            emptyLabel={activeStatus ? `No vacancies with status ${activeStatus} yet.` : "No vacancies tracked yet - add one from the Companies Database."}
          />
        </div>
      </Card>
    </div>
  );
}
