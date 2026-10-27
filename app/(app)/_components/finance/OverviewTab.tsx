"use client";

import { useMemo, useState } from "react";
import {
  budgetVsActual,
  computeAccountBalances,
  incomeByCategory,
  incomeBySource,
  monthlyTrend,
  spendingByCategory,
  summarizeByCurrency,
  totalBalancesByCurrency,
  trendMonths,
} from "../../_lib/finance/analytics";
import { todayIso, type IsoDate } from "../../_lib/finance/dates";
import type { FinanceTransaction } from "../../_lib/finance/types";
import Card from "../Card";
import CategoryBars from "./charts/CategoryBars";
import MonthlyTrendChart from "./charts/MonthlyTrendChart";
import { useFinanceData, useFinanceSnapshot } from "./FinanceDataProvider";
import { Badge, CategoryDot, EmptyState, formatDate, INCOME_COLOR, Money, SectionHeading } from "./FinanceUi";
import type { FinanceTab } from "./FinanceTabs";

type OverviewProps = Readonly<{
  // Transactions after every filter (period included).
  periodTransactions: ReadonlyArray<FinanceTransaction>;
  // Same filters without the period, for the trend chart.
  trendTransactions: ReadonlyArray<FinanceTransaction>;
  period: Readonly<{ start: IsoDate | null; end: IsoDate | null }>;
  onNavigate: (tab: FinanceTab) => void;
}>;

export default function OverviewTab({ periodTransactions, trendTransactions, period, onNavigate }: OverviewProps) {
  const snapshot = useFinanceSnapshot();
  const { context, categoriesById, accountsById } = useFinanceData();
  const today = todayIso();
  const summaries = useMemo(() => summarizeByCurrency(periodTransactions, context), [periodTransactions, context]);
  const [chosenCurrency, setChosenCurrency] = useState<string | null>(null);
  const currency = chosenCurrency && summaries.some((summary) => summary.currency === chosenCurrency) ? chosenCurrency : (summaries[0]?.currency ?? snapshot.accounts[0]?.currency ?? "EUR");

  const balances = useMemo(() => computeAccountBalances(snapshot.accounts.filter((account) => !account.isArchived), snapshot.statements, snapshot.transactions), [snapshot]);
  const totals = totalBalancesByCurrency(balances);
  const spending = spendingByCategory(periodTransactions, context, currency);
  const incomeCategories = incomeByCategory(periodTransactions, context, currency);
  const sources = incomeBySource(periodTransactions, context, currency);
  const trend = monthlyTrend(trendTransactions, context, currency, trendMonths(period.start, period.end, today));
  const budgetPeriod = { start: period.start ?? snapshot.transactions.reduce((min, transaction) => (transaction.bookedOn < min ? transaction.bookedOn : min), today), end: period.end ?? today };
  const budgets = budgetVsActual(snapshot.budgets, periodTransactions, context, budgetPeriod).filter((row) => row.budget.currency === currency);
  const recent = periodTransactions.slice(0, 8);
  const needsReview = snapshot.transactions.filter((transaction) => transaction.reviewStatus === "needs_review").length;
  const pendingImports = snapshot.imports.filter((item) => item.status === "needs_review").length;
  const failedImports = snapshot.imports.filter((item) => item.status === "failed").length;
  const mismatched = snapshot.statements.filter((statement) => statement.reconciliationStatus === "mismatch").length;

  if (snapshot.transactions.length === 0) {
    return (
      <Card className="p-6">
        <EmptyState text="No transactions yet. Import a bank statement (PDF or CSV) or add a transaction by hand to see your finances here.">
          <button type="button" className="rounded-xl border border-purple-500/50 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-white" onClick={() => onNavigate("imports")}>
            Import a statement
          </button>
          <button type="button" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300" onClick={() => onNavigate("transactions")}>
            Add a transaction
          </button>
        </EmptyState>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {needsReview + pendingImports + failedImports + mismatched > 0 ? (
        <div className="flex flex-wrap gap-2">
          {needsReview > 0 ? (
            <button type="button" onClick={() => onNavigate("review")}>
              <Badge tone="amber">{needsReview} transaction{needsReview === 1 ? "" : "s"} to review</Badge>
            </button>
          ) : null}
          {mismatched > 0 ? (
            <button type="button" onClick={() => onNavigate("review")}>
              <Badge tone="rose">{mismatched} statement{mismatched === 1 ? "" : "s"} did not reconcile</Badge>
            </button>
          ) : null}
          {pendingImports > 0 ? (
            <button type="button" onClick={() => onNavigate("imports")}>
              <Badge tone="purple">{pendingImports} import{pendingImports === 1 ? "" : "s"} awaiting review</Badge>
            </button>
          ) : null}
          {failedImports > 0 ? (
            <button type="button" onClick={() => onNavigate("imports")}>
              <Badge tone="rose">{failedImports} failed import{failedImports === 1 ? "" : "s"}</Badge>
            </button>
          ) : null}
        </div>
      ) : null}

      {summaries.length === 0 ? (
        <Card className="p-5">
          <EmptyState text="No transactions match this period and these filters." />
        </Card>
      ) : (
        <div className="space-y-3">
          {summaries.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Currencies are never added together. Charts show:</span>
              {summaries.map((summary) => (
                <button
                  key={summary.currency}
                  type="button"
                  onClick={() => setChosenCurrency(summary.currency)}
                  className={"rounded-full border px-3 py-1 font-semibold transition " + (summary.currency === currency ? "border-purple-400/60 bg-purple-500/15 text-white" : "border-slate-700 text-slate-400 hover:text-white")}
                >
                  {summary.currency}
                </button>
              ))}
            </div>
          ) : null}
          {summaries.map((summary) => (
            <div key={summary.currency} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Income · {summary.currency}</p>
                <p className="mt-2 text-2xl font-black text-white"><Money minor={summary.incomeMinor} currency={summary.currency} /></p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">Spending · {summary.currency}</p>
                <p className="mt-2 text-2xl font-black text-white"><Money minor={summary.expenseMinor} currency={summary.currency} /></p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Net cash flow · {summary.currency}</p>
                <p className={"mt-2 text-2xl font-black " + (summary.netMinor >= 0 ? "text-cyan-200" : "text-rose-200")}>
                  <Money minor={summary.netMinor} currency={summary.currency} signed />
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Kept apart</p>
                <p className="mt-2 text-sm text-slate-300">Debt payments <Money minor={summary.debtMinor} currency={summary.currency} /></p>
                <p className="text-sm text-slate-400">Own transfers <Money minor={summary.transferredMinor} currency={summary.currency} /></p>
                {summary.uncategorisedCount > 0 ? <p className="mt-1 text-xs text-amber-300">Includes {summary.uncategorisedCount} uncategorised by direction</p> : null}
              </Card>
            </div>
          ))}
        </div>
      )}

      <Card className="p-5">
        <SectionHeading title="Accounts" detail="Latest statement closing balance plus anything recorded after it." />
        {balances.length === 0 ? (
          <div className="mt-4"><EmptyState text="No accounts yet." /></div>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {balances.map((entry) => (
                <div key={entry.account.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{entry.account.name}</p>
                      <p className="text-xs text-slate-500">{[entry.account.accountIdentifier?.startsWith("•") ? entry.account.accountIdentifier : null, entry.account.currency].filter(Boolean).join(" · ")}</p>
                    </div>
                    {entry.basis === "transactions" ? <Badge tone="amber">No opening balance</Badge> : null}
                  </div>
                  <p className="mt-3 text-xl font-black text-white">{entry.balanceMinor === null ? "—" : <Money minor={entry.balanceMinor} currency={entry.account.currency} />}</p>
                  <p className="text-xs text-slate-500">{entry.asOf ? `as of ${formatDate(entry.asOf)}` : "No data yet"}</p>
                </div>
              ))}
            </div>
            {totals.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-800 pt-3 text-sm text-slate-400">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Total available</span>
                {totals.map((total) => (
                  <span key={total.currency}>
                    <Money minor={total.balanceMinor} currency={total.currency} className="font-semibold text-white" /> <span className="text-xs">({total.accountCount} account{total.accountCount === 1 ? "" : "s"})</span>
                  </span>
                ))}
              </div>
            ) : null}
          </>
        )}
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <SectionHeading title={`Spending by category · ${currency}`} />
          <div className="mt-4">
            <CategoryBars rows={spending} currency={currency} emptyText="No spending in this period." />
          </div>
        </Card>
        <Card className="p-5">
          <SectionHeading title={`Income sources · ${currency}`} />
          <div className="mt-4">
            <CategoryBars rows={incomeCategories} currency={currency} color={INCOME_COLOR} emptyText="No income in this period." />
          </div>
          {sources.length > 0 ? (
            <div className="mt-5 border-t border-slate-800 pt-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Top payers</p>
              <ul className="mt-2 space-y-1 text-sm">
                {sources.map((source) => (
                  <li key={source.name} className="flex justify-between gap-3">
                    <span className="truncate text-slate-300">{source.name}</span>
                    <Money minor={source.amountMinor} currency={currency} className="text-slate-200" />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      </div>

      <Card className="p-5">
        <SectionHeading title={`Monthly trend · ${currency}`} detail="Income and spending per month, transfers and exchanges excluded." />
        <div className="mt-4">
          <MonthlyTrendChart points={trend} currency={currency} />
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <SectionHeading
            title={`Budgets · ${currency}`}
            detail="Monthly budgets, scaled to the selected period."
            action={
              <button type="button" className="text-xs text-slate-400 hover:text-white" onClick={() => onNavigate("budgets")}>
                Manage
              </button>
            }
          />
          <div className="mt-4 space-y-3">
            {budgets.length === 0 ? (
              <EmptyState text={`No ${currency} budgets yet.`} />
            ) : (
              budgets.slice(0, 6).map((row) => (
                <div key={row.budget.id}>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 truncate text-slate-200">
                      <CategoryDot category={row.category} /> {row.category?.name ?? "Deleted category"}
                    </span>
                    <span className={"tabular-nums " + (row.isOver ? "text-rose-300" : "text-slate-300")}>
                      <Money minor={row.actualMinor} currency={currency} /> / <Money minor={row.budgetMinor} currency={currency} />
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-white/5">
                    <div className={"h-full rounded-full " + (row.isOver ? "bg-rose-500" : "bg-purple-500")} style={{ width: `${Math.min(100, Math.max(0, row.percentUsed))}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeading
            title="Recent transactions"
            action={
              <button type="button" className="text-xs text-slate-400 hover:text-white" onClick={() => onNavigate("transactions")}>
                All transactions
              </button>
            }
          />
          <ul className="mt-3 divide-y divide-slate-800">
            {recent.map((transaction) => {
              const category = transaction.categoryId ? categoriesById.get(transaction.categoryId) : null;
              return (
                <li key={transaction.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-slate-200">{transaction.merchant ?? transaction.descriptionOriginal}</p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-slate-500">
                      <CategoryDot category={category} /> {category?.name ?? "Needs review"} · {formatDate(transaction.bookedOn)} · {accountsById.get(transaction.accountId)?.name}
                    </p>
                  </div>
                  <Money minor={transaction.amountMinor} currency={transaction.currency} signed className="shrink-0" />
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
