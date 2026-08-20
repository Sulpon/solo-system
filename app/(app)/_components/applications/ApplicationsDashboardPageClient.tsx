"use client";

import { useMemo } from "react";
import CareerHubBackLink from "../career/CareerHubBackLink";
import { useCompanyEntries } from "../../_lib/hooks/useCompanyEntries";
import { useVacancyEntries } from "../../_lib/hooks/useVacancyEntries";
import ApplicationPipelinePanel from "./ApplicationPipelinePanel";

export default function ApplicationsDashboardPageClient() {
  const { entries: companies, hasLoaded: companiesLoaded } = useCompanyEntries();
  const { entries: vacancies, hasLoaded: vacanciesLoaded } = useVacancyEntries();

  const companyNames = useMemo(() => new Map(companies.map((company) => [company.id, company.name] as const)), [companies]);

  if (!companiesLoaded || !vacanciesLoaded) {
    return null;
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

      <ApplicationPipelinePanel vacancies={vacancies} companyNames={companyNames} />
    </div>
  );
}
