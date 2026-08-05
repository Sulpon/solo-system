"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "../Card";
import CareerHubBackLink from "../career/CareerHubBackLink";
import { useCompanyEntries } from "../../_lib/hooks/useCompanyEntries";
import { useVacancyEntries } from "../../_lib/hooks/useVacancyEntries";
import { createCompanyEntry } from "../../_lib/types/company-database";
import type { CompanyEntry } from "../../_lib/types/company-database";
import { compareVacancyStatus } from "../../_lib/types/vacancy";
import { withoutCompanyVacancies } from "../../_lib/vacancy-cascade";
import CompanyTable, { type CompanyGroup } from "./CompanyTable";
import type { CompanyVacancySummary } from "./CompanyRow";
import CompanyImportModal from "./CompanyImportModal";
import AddCompanyModal from "./AddCompanyModal";
import CompanyFilters, { type CompanyGroupKey, type CompanySortKey } from "./CompanyFilters";

function matchesSearch(entry: CompanyEntry, search: string) {
  if (!search.trim()) {
    return true;
  }

  const needle = search.trim().toLowerCase();
  return [entry.name, entry.country, entry.city, entry.industry].some((field) => field.toLowerCase().includes(needle));
}

function compareEntries(first: CompanyEntry, second: CompanyEntry, sortKey: CompanySortKey, summaries: ReadonlyMap<string, CompanyVacancySummary>): number {
  if (sortKey === "country") {
    return first.country.localeCompare(second.country) || first.name.localeCompare(second.name);
  }

  if (sortKey === "industry") {
    return first.industry.localeCompare(second.industry) || first.name.localeCompare(second.name);
  }

  if (sortKey === "vacancyActivity") {
    const firstBest = summaries.get(first.id)?.bestStatus ?? null;
    const secondBest = summaries.get(second.id)?.bestStatus ?? null;

    if (firstBest && secondBest) {
      return compareVacancyStatus(firstBest, secondBest) || first.name.localeCompare(second.name);
    }

    if (firstBest) return -1;
    if (secondBest) return 1;
    return first.name.localeCompare(second.name);
  }

  return first.name.localeCompare(second.name);
}

function buildGroups(entries: ReadonlyArray<CompanyEntry>, groupKey: CompanyGroupKey): CompanyGroup[] {
  if (groupKey === "none") {
    return [{ key: "all", label: null, entries }];
  }

  const fallbackLabel = groupKey === "country" ? "Unspecified Country" : "Unspecified Industry";
  const buckets = new Map<string, CompanyEntry[]>();

  entries.forEach((entry) => {
    const rawValue = groupKey === "country" ? entry.country : entry.industry;
    const value = rawValue.trim() || fallbackLabel;
    const list = buckets.get(value) ?? [];
    list.push(entry);
    buckets.set(value, list);
  });

  const sortedKeys = Array.from(buckets.keys()).sort((a, b) => {
    if (a === fallbackLabel) return 1;
    if (b === fallbackLabel) return -1;
    return a.localeCompare(b);
  });

  return sortedKeys.map((key) => ({ key, label: key, entries: buckets.get(key) ?? [] }));
}

export default function CompaniesPageClient() {
  const router = useRouter();
  const { entries, setEntries, hasLoaded } = useCompanyEntries();
  const { entries: vacancyEntries, setEntries: setVacancyEntries, hasLoaded: vacanciesLoaded } = useVacancyEntries();

  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("all");
  const [industry, setIndustry] = useState("all");
  const [sortKey, setSortKey] = useState<CompanySortKey>("vacancyActivity");
  const [groupKey, setGroupKey] = useState<CompanyGroupKey>("none");

  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const countryOptions = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.country.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [entries],
  );
  const industryOptions = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.industry.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [entries],
  );

  const vacancySummaries = useMemo(() => {
    const map = new Map<string, CompanyVacancySummary>();

    for (const company of entries) {
      const companyVacancies = vacancyEntries.filter((vacancy) => vacancy.companyId === company.id);
      const bestStatus =
        companyVacancies.length === 0
          ? null
          : companyVacancies.reduce((best, current) => (compareVacancyStatus(current.status, best.status) < 0 ? current : best)).status;

      map.set(company.id, { count: companyVacancies.length, bestStatus });
    }

    return map;
  }, [entries, vacancyEntries]);

  const visibleEntries = useMemo(() => {
    return entries
      .filter((entry) => matchesSearch(entry, search))
      .filter((entry) => country === "all" || entry.country === country)
      .filter((entry) => industry === "all" || entry.industry === industry)
      .sort((first, second) => compareEntries(first, second, sortKey, vacancySummaries));
  }, [entries, search, country, industry, sortKey, vacancySummaries]);

  const groups = useMemo(() => buildGroups(visibleEntries, groupKey), [visibleEntries, groupKey]);

  if (!hasLoaded || !vacanciesLoaded) {
    return null;
  }

  function createCompany(fields: { name: string; country: string; industry: string }) {
    const entry: CompanyEntry = { ...createCompanyEntry(fields.name), country: fields.country, industry: fields.industry };
    setEntries((current) => [...current, entry]);
    setShowAddCompany(false);
    router.push(`/career-hub/companies/${entry.id}`);
  }

  function deleteCompany(entryId: string) {
    setEntries((current) => current.filter((entry) => entry.id !== entryId));
    setVacancyEntries((current) => withoutCompanyVacancies(current, entryId));
  }

  function importCompanies(names: string[]) {
    setEntries((current) => [...current, ...names.map((name) => createCompanyEntry(name))]);
    setShowImport(false);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-500/20 bg-slate-950/45 p-5 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <CareerHubBackLink />
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Career Hub</p>
            <h1 className="mt-2 text-3xl font-black text-white">🏢 Companies Database</h1>
            <p className="mt-2 text-sm text-slate-400">Research target companies once, then track every open role as its own vacancy.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowImport(true)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-purple-400/60 hover:text-white">
              Import Companies
            </button>
            <button
              type="button"
              onClick={() => setShowAddCompany(true)}
              className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
            >
              + Add Company
            </button>
          </div>
        </div>
      </div>

      <Card className="p-5">
        <CompanyFilters
          search={search}
          onSearchChange={setSearch}
          country={country}
          onCountryChange={setCountry}
          countryOptions={countryOptions}
          industry={industry}
          onIndustryChange={setIndustry}
          industryOptions={industryOptions}
          sortKey={sortKey}
          onSortKeyChange={setSortKey}
          groupKey={groupKey}
          onGroupKeyChange={setGroupKey}
        />
        <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">
          {visibleEntries.length} of {entries.length} companies shown
        </p>
      </Card>

      <CompanyTable groups={groups} vacancySummaries={vacancySummaries} onDelete={deleteCompany} />

      {showAddCompany ? <AddCompanyModal onCancel={() => setShowAddCompany(false)} onCreate={createCompany} /> : null}
      {showImport ? (
        <CompanyImportModal existingNames={entries.map((entry) => entry.name)} onCancel={() => setShowImport(false)} onImport={importCompanies} />
      ) : null}
    </div>
  );
}
