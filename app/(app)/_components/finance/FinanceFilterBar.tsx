"use client";

import { PERIOD_LABELS, UNCATEGORISED_FILTER, type FlowClass, type PeriodPreset } from "../../_lib/finance/analytics";
import type { FinanceAccount, FinanceCategory } from "../../_lib/finance/types";
import { inputClass } from "./FinanceUi";

export type FilterState = Readonly<{
  preset: PeriodPreset;
  customStart: string;
  customEnd: string;
  accountId: string | null;
  currency: string | null;
  categoryId: string | null;
  flow: FlowClass | null;
  search: string;
}>;

export const DEFAULT_FILTER_STATE: FilterState = {
  preset: "this-month",
  customStart: "",
  customEnd: "",
  accountId: null,
  currency: null,
  categoryId: null,
  flow: null,
  search: "",
};

const FLOW_LABELS: Readonly<Record<FlowClass, string>> = {
  income: "Income",
  expense: "Spending",
  debt: "Debt payments",
  transfer: "Own transfers",
  exchange: "Currency exchange",
};

const compactInput = inputClass.replace("w-full", "w-full sm:w-auto");

export default function FinanceFilterBar({
  value,
  onChange,
  accounts,
  categories,
  currencies,
  showSearch = false,
}: Readonly<{
  value: FilterState;
  onChange: (next: FilterState) => void;
  accounts: ReadonlyArray<FinanceAccount>;
  categories: ReadonlyArray<FinanceCategory>;
  currencies: ReadonlyArray<string>;
  showSearch?: boolean;
}>) {
  const set = (patch: Partial<FilterState>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <select aria-label="Period" className={compactInput} value={value.preset} onChange={(event) => set({ preset: event.target.value as PeriodPreset })}>
        {(Object.keys(PERIOD_LABELS) as PeriodPreset[]).map((preset) => (
          <option key={preset} value={preset}>
            {PERIOD_LABELS[preset]}
          </option>
        ))}
      </select>
      {value.preset === "custom" ? (
        <>
          <input aria-label="From" type="date" className={compactInput} value={value.customStart} onChange={(event) => set({ customStart: event.target.value })} />
          <input aria-label="To" type="date" className={compactInput} value={value.customEnd} onChange={(event) => set({ customEnd: event.target.value })} />
        </>
      ) : null}
      <select aria-label="Account" className={compactInput} value={value.accountId ?? ""} onChange={(event) => set({ accountId: event.target.value || null })}>
        <option value="">All accounts</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </select>
      <select aria-label="Currency" className={compactInput} value={value.currency ?? ""} onChange={(event) => set({ currency: event.target.value || null })}>
        <option value="">All currencies</option>
        {currencies.map((currency) => (
          <option key={currency} value={currency}>
            {currency}
          </option>
        ))}
      </select>
      <select aria-label="Category" className={compactInput} value={value.categoryId ?? ""} onChange={(event) => set({ categoryId: event.target.value || null })}>
        <option value="">All categories</option>
        <option value={UNCATEGORISED_FILTER}>Needs review</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <select aria-label="Type" className={compactInput} value={value.flow ?? ""} onChange={(event) => set({ flow: (event.target.value || null) as FlowClass | null })}>
        <option value="">All types</option>
        {(Object.keys(FLOW_LABELS) as FlowClass[]).map((flow) => (
          <option key={flow} value={flow}>
            {FLOW_LABELS[flow]}
          </option>
        ))}
      </select>
      {showSearch ? (
        <input
          aria-label="Search merchant or description"
          type="search"
          placeholder="Search merchant or description"
          className={inputClass + " sm:min-w-[220px] sm:flex-1"}
          value={value.search}
          onChange={(event) => set({ search: event.target.value })}
        />
      ) : null}
    </div>
  );
}

export { FLOW_LABELS };
