"use client";

export type CompanySortKey = "name" | "country" | "industry" | "vacancyActivity";
export type CompanyGroupKey = "none" | "country" | "industry";

export const COMPANY_SORT_OPTIONS: ReadonlyArray<{ value: CompanySortKey; label: string }> = [
  { value: "vacancyActivity", label: "Vacancy Activity" },
  { value: "name", label: "Name (A-Z)" },
  { value: "country", label: "Country" },
  { value: "industry", label: "Industry" },
];

export const COMPANY_GROUP_OPTIONS: ReadonlyArray<{ value: CompanyGroupKey; label: string }> = [
  { value: "none", label: "No Grouping" },
  { value: "country", label: "Country" },
  { value: "industry", label: "Industry" },
];

type CompanyFiltersProps = Readonly<{
  search: string;
  onSearchChange: (next: string) => void;
  country: string;
  onCountryChange: (next: string) => void;
  countryOptions: ReadonlyArray<string>;
  industry: string;
  onIndustryChange: (next: string) => void;
  industryOptions: ReadonlyArray<string>;
  sortKey: CompanySortKey;
  onSortKeyChange: (next: CompanySortKey) => void;
  groupKey: CompanyGroupKey;
  onGroupKeyChange: (next: CompanyGroupKey) => void;
}>;

const selectClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

export default function CompanyFilters({
  search,
  onSearchChange,
  country,
  onCountryChange,
  countryOptions,
  industry,
  onIndustryChange,
  industryOptions,
  sortKey,
  onSortKeyChange,
  groupKey,
  onGroupKeyChange,
}: CompanyFiltersProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      <label className="space-y-1.5 lg:col-span-2 xl:col-span-2">
        <span className={labelClass}>Search</span>
        <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search companies..." className={selectClass} />
      </label>

      <label className="space-y-1.5">
        <span className={labelClass}>Country</span>
        <select value={country} onChange={(event) => onCountryChange(event.target.value)} className={selectClass}>
          <option value="all">All Countries</option>
          {countryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1.5">
        <span className={labelClass}>Industry</span>
        <select value={industry} onChange={(event) => onIndustryChange(event.target.value)} className={selectClass}>
          <option value="all">All Industries</option>
          {industryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1.5">
        <span className={labelClass}>Sort By</span>
        <select value={sortKey} onChange={(event) => onSortKeyChange(event.target.value as CompanySortKey)} className={selectClass}>
          {COMPANY_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1.5">
        <span className={labelClass}>Group By</span>
        <select value={groupKey} onChange={(event) => onGroupKeyChange(event.target.value as CompanyGroupKey)} className={selectClass}>
          {COMPANY_GROUP_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
