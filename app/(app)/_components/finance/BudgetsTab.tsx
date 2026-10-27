"use client";

import { useState } from "react";
import { budgetVsActual, monthsSpanned } from "../../_lib/finance/analytics";
import { todayIso, type IsoDate } from "../../_lib/finance/dates";
import { isCurrencyCode, minorToMajorString, parseUserAmount } from "../../_lib/finance/money";
import { deleteBudget, upsertBudget } from "../../_lib/finance/repository/finance-repository";
import Card from "../Card";
import { useFinanceData, useFinanceSnapshot } from "./FinanceDataProvider";
import { buttonClass, CategoryDot, EmptyState, inputClass, Money, primaryButtonClass, SectionHeading } from "./FinanceUi";

// Monthly budgets per category and currency, compared with actual
// spending over the selected period (scaled: a quarter is three months of
// budget, half a month is half).

export default function BudgetsTab({ period, filterBar }: Readonly<{ period: Readonly<{ start: IsoDate | null; end: IsoDate | null }>; filterBar: React.ReactNode }>) {
  const snapshot = useFinanceSnapshot();
  const { context, mutate } = useFinanceData();
  const spendable = snapshot.categories.filter((category) => category.isEnabled && (category.kind === "expense" || category.kind === "debt"));
  const defaultCurrency = snapshot.accounts[0]?.currency ?? "EUR";
  const [categoryId, setCategoryId] = useState(spendable[0]?.id ?? "");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [amount, setAmount] = useState("");

  const today = todayIso();
  const range = {
    start: period.start ?? snapshot.transactions.reduce((min, transaction) => (transaction.bookedOn < min ? transaction.bookedOn : min), today),
    end: period.end ?? today,
  };
  const rows = budgetVsActual(snapshot.budgets, snapshot.transactions, context, range);
  const months = monthsSpanned(range.start, range.end);
  const minor = parseUserAmount(amount, currency);
  const canSave = Boolean(categoryId) && isCurrencyCode(currency) && minor !== null && minor > 0;

  const save = () =>
    void mutate((client, userId) => upsertBudget(client, userId, { categoryId, currency, monthlyAmountMinor: minor as number }), "Budget saved.").then((ok) => ok && setAmount(""));

  return (
    <div className="space-y-5">
      <Card className="space-y-3 p-4">
        {filterBar}
        <p className="text-xs text-slate-500">
          {range.start} – {range.end} · {months.toFixed(2)} month{months === 1 ? "" : "s"} of budget
        </p>
      </Card>

      <Card className="p-5">
        <SectionHeading title="Budget vs actual" detail="Linked transfers between your own accounts never count against a budget." />
        <div className="mt-4">
          {rows.length === 0 ? (
            <EmptyState text="No budgets yet. Add one below." />
          ) : (
            <ul className="space-y-4">
              {rows.map((row) => (
                <li key={row.budget.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 text-slate-100">
                      <CategoryDot category={row.category} /> {row.category?.name ?? "Deleted category"} <span className="text-xs text-slate-500">{row.budget.currency}</span>
                    </span>
                    <span className="flex items-center gap-3 tabular-nums">
                      <span className={row.isOver ? "text-rose-300" : "text-slate-200"}>
                        <Money minor={row.actualMinor} currency={row.budget.currency} /> of <Money minor={row.budgetMinor} currency={row.budget.currency} />
                      </span>
                      <span className={"text-xs " + (row.isOver ? "text-rose-300" : "text-slate-500")}>
                        {row.percentUsed}% · {row.remainingMinor >= 0 ? <>left <Money minor={row.remainingMinor} currency={row.budget.currency} /></> : <>over by <Money minor={-row.remainingMinor} currency={row.budget.currency} /></>}
                      </span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-white/5">
                    <div className={"h-full rounded-full " + (row.isOver ? "bg-rose-500" : "bg-purple-500")} style={{ width: `${Math.min(100, Math.max(0, row.percentUsed))}%` }} />
                  </div>
                  <div className="mt-1 flex justify-end gap-3 text-xs text-slate-500">
                    <span>
                      Monthly <Money minor={row.budget.monthlyAmountMinor} currency={row.budget.currency} />
                    </span>
                    <button
                      type="button"
                      className="hover:text-white"
                      onClick={() => {
                        setCategoryId(row.budget.categoryId);
                        setCurrency(row.budget.currency);
                        setAmount(minorToMajorString(row.budget.monthlyAmountMinor, row.budget.currency));
                      }}
                    >
                      Edit
                    </button>
                    <button type="button" className="hover:text-rose-300" onClick={() => void mutate((client, userId) => deleteBudget(client, userId, row.budget.id), "Budget removed.")}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeading title="Set a monthly budget" detail="One budget per category and currency; saving again replaces it." />
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_110px_160px_auto]">
          <select aria-label="Category" className={inputClass} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            {spendable.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input aria-label="Currency" className={inputClass + " uppercase"} maxLength={3} value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} />
          <input aria-label="Monthly amount" className={inputClass} inputMode="decimal" placeholder="Monthly amount" value={amount} onChange={(event) => setAmount(event.target.value)} />
          <button type="button" className={canSave ? primaryButtonClass : buttonClass} disabled={!canSave} onClick={save}>
            Save budget
          </button>
        </div>
      </Card>
    </div>
  );
}
