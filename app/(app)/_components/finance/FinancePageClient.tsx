"use client";

import { useEffect, useMemo, useState } from "react";
import { currenciesOf, EMPTY_FILTERS, filterTransactions, resolvePeriod } from "../../_lib/finance/analytics";
import { todayIso } from "../../_lib/finance/dates";
import { useCloudSync } from "../../_lib/hooks/useCloudSync";
import Card from "../Card";
import BudgetsTab from "./BudgetsTab";
import { FinanceDataProvider, useFinanceData } from "./FinanceDataProvider";
import FinanceFilterBar, { DEFAULT_FILTER_STATE, type FilterState } from "./FinanceFilterBar";
import FinanceTabs, { type FinanceTab } from "./FinanceTabs";
import { primaryButtonClass } from "./FinanceUi";
import ImportsTab from "./ImportsTab";
import OverviewTab from "./OverviewTab";
import RequiredPaymentsRail from "./RequiredPaymentsRail";
import ReviewTab from "./ReviewTab";
import SettingsTab from "./SettingsTab";
import TransactionsTab from "./TransactionsTab";

// Atlas Finance. The page only arranges tabs and owns the shared filters;
// every number is computed in _lib/finance and every read/write goes
// through the repository.

function Header({ children }: Readonly<{ children?: React.ReactNode }>) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div aria-hidden className="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_60%_40%,rgba(8,145,178,0.18),transparent_45%)]" />
      <div className="relative">
        <p className="atlas-accent text-xs font-semibold uppercase tracking-[0.22em]">Finance</p>
        <h1 className="atlas-display mt-2 text-3xl font-black text-white">Treasury</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">Statements in, a clear picture out: income, spending, balances and the payments that must go out this month. Parsed and counted by plain code — no AI touches your bank data.</p>
        {children}
      </div>
    </Card>
  );
}

function Notice() {
  const { notice, showNotice } = useFinanceData();

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => showNotice(null), notice.kind === "error" ? 9000 : 4500);
    return () => window.clearTimeout(timer);
  }, [notice, showNotice]);

  if (!notice) return null;

  return (
    <div
      role={notice.kind === "error" ? "alert" : "status"}
      className={
        "fixed bottom-24 left-1/2 z-40 w-[min(92vw,520px)] -translate-x-1/2 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl " +
        (notice.kind === "error" ? "border-rose-500/50 bg-rose-950/90 text-rose-100" : "border-emerald-500/40 bg-slate-950/90 text-emerald-100")
      }
    >
      {notice.text}
    </div>
  );
}

function FinanceWorkspace() {
  const { snapshot, status, error, reload, context } = useFinanceData();
  const [tab, setTab] = useState<FinanceTab>("overview");
  const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const today = todayIso();

  const { preset, customStart, customEnd, accountId, currency, categoryId, flow } = filterState;
  const period = useMemo(() => resolvePeriod(preset, today, { start: customStart || null, end: customEnd || null }), [preset, today, customStart, customEnd]);
  const baseFilters = useMemo(() => ({ ...EMPTY_FILTERS, accountId, currency, categoryId, flow }), [accountId, currency, categoryId, flow]);
  const transactions = useMemo(() => snapshot?.transactions ?? [], [snapshot]);

  const periodTransactions = useMemo(() => filterTransactions(transactions, { ...baseFilters, ...period }, context), [transactions, baseFilters, period, context]);
  const trendTransactions = useMemo(() => filterTransactions(transactions, baseFilters, context), [transactions, baseFilters, context]);
  const searchedTransactions = useMemo(() => filterTransactions(periodTransactions, { ...EMPTY_FILTERS, search: filterState.search }, context), [periodTransactions, filterState.search, context]);

  if (status === "loading") {
    return (
      <Card className="p-6">
        <p className="text-sm text-slate-400">Loading your finances…</p>
      </Card>
    );
  }

  if (status === "setup-required") {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-black text-white">Finance tables are not set up yet</h2>
        <p className="mt-2 text-sm text-slate-400">
          Apply the migration <code className="text-purple-200">supabase/migrations/20261027120000_finance.sql</code> in the Supabase SQL editor (or with <code className="text-purple-200">supabase db push</code>), then reload.
        </p>
        <button type="button" className={primaryButtonClass + " mt-4"} onClick={() => void reload()}>
          Try again
        </button>
      </Card>
    );
  }

  if (status === "error" || !snapshot) {
    return (
      <Card className="p-6">
        <p className="text-sm text-rose-200">{error ?? "Finance data could not be loaded."}</p>
        <button type="button" className={primaryButtonClass + " mt-4"} onClick={() => void reload()}>
          Try again
        </button>
      </Card>
    );
  }

  const filterBar = (showSearch: boolean) => (
    <FinanceFilterBar value={filterState} onChange={setFilterState} accounts={snapshot.accounts} categories={snapshot.categories} currencies={currenciesOf(snapshot.transactions, snapshot.accounts)} showSearch={showSearch} />
  );

  const counts: Partial<Record<FinanceTab, number>> = {
    review: snapshot.transactions.filter((transaction) => transaction.reviewStatus === "needs_review").length,
    imports: snapshot.imports.filter((item) => item.status === "needs_review").length,
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-4">
        <FinanceTabs active={tab} onChange={setTab} counts={counts} />
        {tab === "overview" ? (
          <>
            <Card className="p-4">{filterBar(false)}</Card>
            <OverviewTab periodTransactions={periodTransactions} trendTransactions={trendTransactions} period={period} onNavigate={setTab} />
          </>
        ) : null}
        {tab === "transactions" ? <TransactionsTab transactions={searchedTransactions} filterBar={filterBar(true)} /> : null}
        {tab === "review" ? <ReviewTab /> : null}
        {tab === "imports" ? <ImportsTab /> : null}
        {tab === "budgets" ? <BudgetsTab period={period} filterBar={filterBar(false)} /> : null}
        {tab === "settings" ? <SettingsTab /> : null}
      </div>
      <aside className="order-first space-y-4 lg:sticky lg:top-24 lg:order-none lg:self-start">
        <RequiredPaymentsRail />
      </aside>
    </div>
  );
}

export default function FinancePageClient() {
  const { isCloudSyncAvailable, isAuthLoading, user, signInWithGoogle } = useCloudSync();

  if (!isCloudSyncAvailable) {
    return (
      <Header>
        <p className="mt-4 text-sm text-amber-200">Finance stores your statements privately in your Supabase project, which is not configured for this Atlas. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to use it.</p>
      </Header>
    );
  }

  if (isAuthLoading) {
    return (
      <Header>
        <p className="mt-4 text-sm text-slate-500">Checking your session…</p>
      </Header>
    );
  }

  if (!user) {
    return (
      <Header>
        <p className="mt-4 text-sm text-slate-300">Sign in to keep your bank data private to your account.</p>
        <button type="button" className={primaryButtonClass + " mt-3"} onClick={() => void signInWithGoogle()}>
          Sign in with Google
        </button>
      </Header>
    );
  }

  return (
    <FinanceDataProvider key={user.id} userId={user.id}>
      <div className="space-y-5">
        <Header />
        <FinanceWorkspace />
      </div>
      <Notice />
    </FinanceDataProvider>
  );
}
