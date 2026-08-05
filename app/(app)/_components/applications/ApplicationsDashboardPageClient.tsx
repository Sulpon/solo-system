"use client";

import { useMemo, useState } from "react";
import Card from "../Card";
import CareerHubBackLink from "../career/CareerHubBackLink";
import { useCompanyEntries } from "../../_lib/hooks/useCompanyEntries";
import { useVacancyEntries } from "../../_lib/hooks/useVacancyEntries";
import { VACANCY_STATUSES, compareVacancyStatus } from "../../_lib/types/vacancy";
import type { VacancyStatus } from "../../_lib/types/vacancy";
import ApplicationStatusCard from "./ApplicationStatusCard";
import ApplicationVacancyTable from "./ApplicationVacancyTable";

export default function ApplicationsDashboardPageClient() {
  const { entries: companies, hasLoaded: companiesLoaded } = useCompanyEntries();
  const { entries: vacancies, hasLoaded: vacanciesLoaded } = useVacancyEntries();
  const [activeStatus, setActiveStatus] = useState<VacancyStatus | null>(null);

  const companyNames = useMemo(() => new Map(companies.map((company) => [company.id, company.name] as const)), [companies]);

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

  if (!companiesLoaded || !vacanciesLoaded) {
    return null;
  }

  function toggleStatus(status: VacancyStatus) {
    setActiveStatus((current) => (current === status ? null : status));
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-500/20 bg-slate-950/45 p-5 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <CareerHubBackLink />
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Career Hub</p>
        <h1 className="mt-2 text-3xl font-black text-white">📋 Applications Dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">Your job search pipeline at a glance. Statuses live on each vacancy&rsquo;s own page - this view just reflects them.</p>
        <p className="mt-4 text-sm text-slate-300">
          Total tracked vacancies: <span className="font-bold text-white">{vacancies.length}</span>
        </p>
      </div>

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
