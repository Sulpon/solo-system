"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "../Card";
import VacancyCard from "./VacancyCard";
import { useCompanyEntries } from "../../_lib/hooks/useCompanyEntries";
import { useVacancyEntries } from "../../_lib/hooks/useVacancyEntries";
import { YES_NO_UNKNOWN_OPTIONS } from "../../_lib/types/company-database";
import type { CompanyEntry, YesNoUnknown } from "../../_lib/types/company-database";
import { createVacancyEntry } from "../../_lib/types/vacancy";
import { withoutCompanyVacancies } from "../../_lib/vacancy-cascade";

type CompanyDetailPageClientProps = Readonly<{ companyId: string }>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";
const sectionLabelClass = "text-xs font-semibold uppercase tracking-[0.22em] text-purple-300";

export default function CompanyDetailPageClient({ companyId }: CompanyDetailPageClientProps) {
  const router = useRouter();
  const { entries, setEntries, hasLoaded } = useCompanyEntries();
  const { entries: vacancies, setEntries: setVacancies, hasLoaded: vacanciesLoaded } = useVacancyEntries();

  if (!hasLoaded || !vacanciesLoaded) {
    return null;
  }

  const entry = entries.find((company) => company.id === companyId);

  if (!entry) {
    return (
      <Card className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center">
        <p className={sectionLabelClass}>Company Not Found</p>
        <h1 className="mt-3 text-2xl font-black text-white">This company no longer exists</h1>
        <p className="mt-3 text-sm text-slate-400">It may have been deleted. Head back to the Companies Database to pick another one.</p>
        <Link
          href="/career-hub/companies"
          className="mt-5 inline-block rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
        >
          ← Back to Companies
        </Link>
      </Card>
    );
  }

  const companyVacancies = vacancies.filter((vacancy) => vacancy.companyId === companyId);
  const companyName = entry.name;

  function update(patch: Partial<CompanyEntry>) {
    setEntries((current) => current.map((company) => (company.id === companyId ? { ...company, ...patch } : company)));
  }

  function deleteCompany() {
    if (companyVacancies.length > 0 && !window.confirm(`Delete ${companyName} and its ${companyVacancies.length} vacanc${companyVacancies.length === 1 ? "y" : "ies"}?`)) {
      return;
    }

    setEntries((current) => current.filter((company) => company.id !== companyId));
    setVacancies((current) => withoutCompanyVacancies(current, companyId));
    router.push("/career-hub/companies");
  }

  function addVacancy() {
    const vacancy = createVacancyEntry(companyId);
    setVacancies((current) => [...current, vacancy]);
    router.push(`/career-hub/companies/${companyId}/vacancies/${vacancy.id}`);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-500/20 bg-slate-950/45 p-5 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <Link
          href="/career-hub/companies"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-purple-300"
        >
          ← Companies
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className={sectionLabelClass}>Company</p>
            <input
              value={entry.name}
              onChange={(event) => update({ name: event.target.value })}
              className="mt-2 w-full max-w-xl rounded-lg border border-transparent bg-transparent px-1 text-3xl font-black text-white outline-none transition focus:border-purple-400 focus:bg-slate-950/70"
              placeholder="Company Name"
            />
          </div>
          <button
            type="button"
            onClick={deleteCompany}
            className="shrink-0 rounded-xl border border-rose-500/40 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10"
          >
            Delete Company
          </button>
        </div>
      </div>

      <Card className="p-5">
        <p className={sectionLabelClass}>Basic Information</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-2">
            <span className={labelClass}>Country</span>
            <input value={entry.country} onChange={(event) => update({ country: event.target.value })} className={inputClass} placeholder="Netherlands" />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>City / Location</span>
            <input value={entry.city} onChange={(event) => update({ city: event.target.value })} className={inputClass} placeholder="Heerlen" />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Industry</span>
            <input value={entry.industry} onChange={(event) => update({ industry: event.target.value })} className={inputClass} placeholder="Chemical / Biotechnology" />
          </label>
          <label className="space-y-2 lg:col-span-2">
            <span className={labelClass}>Website</span>
            <input value={entry.website} onChange={(event) => update({ website: event.target.value })} className={inputClass} placeholder="https://www.example.com" />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Company Size</span>
            <input value={entry.companySize} onChange={(event) => update({ companySize: event.target.value })} className={inputClass} placeholder="e.g. 1,000+ employees" />
          </label>
        </div>
      </Card>

      <Card className="p-5">
        <p className={sectionLabelClass}>Career Opportunities</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClass}>Careers Page</span>
            <input value={entry.careersPageUrl} onChange={(event) => update({ careersPageUrl: event.target.value })} className={inputClass} placeholder="https://careers.example.com" />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>LinkedIn Page</span>
            <input value={entry.linkedinUrl} onChange={(event) => update({ linkedinUrl: event.target.value })} className={inputClass} placeholder="https://linkedin.com/company/..." />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Graduate Programs</span>
            <select
              value={entry.graduateProgramsAvailable}
              onChange={(event) => update({ graduateProgramsAvailable: event.target.value as YesNoUnknown })}
              className={inputClass}
            >
              {YES_NO_UNKNOWN_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Visa Sponsorship</span>
            <select value={entry.visaSponsorship} onChange={(event) => update({ visaSponsorship: event.target.value as YesNoUnknown })} className={inputClass}>
              {YES_NO_UNKNOWN_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className={labelClass}>English-friendly Environment</span>
            <select
              value={entry.englishFriendlyEnvironment}
              onChange={(event) => update({ englishFriendlyEnvironment: event.target.value as YesNoUnknown })}
              className={inputClass}
            >
              {YES_NO_UNKNOWN_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 border-t border-slate-800 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className={sectionLabelClass}>Vacancies</p>
            <button
              type="button"
              onClick={addVacancy}
              className="rounded-xl border border-dashed border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 transition hover:border-emerald-400/50 hover:text-emerald-200"
            >
              + Add Vacancy
            </button>
          </div>
          {companyVacancies.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {companyVacancies.map((vacancy) => (
                <VacancyCard key={vacancy.id} companyId={companyId} vacancy={vacancy} />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/45 p-5 text-center text-sm text-slate-400">
              No vacancies yet for this company. Add one when you find an open role.
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <p className={sectionLabelClass}>Notes</p>
        <textarea
          value={entry.notes}
          onChange={(event) => update({ notes: event.target.value })}
          className={inputClass + " mt-3 min-h-40"}
          placeholder="Company research, culture, interesting projects, networking contacts, recruiter information, salary notes..."
        />
      </Card>
    </div>
  );
}
