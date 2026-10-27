import { daysBetween, daysInMonth, endOfMonth, isWithin, monthKeyOf, monthsInRange, shiftMonth, startOfMonth, type IsoDate, type MonthKey } from "./dates";
import { normalizeText } from "./text";
import type { Budget, FinanceAccount, FinanceCategory, FinanceTransaction, Statement, TransferLink } from "./types";

// Every number on the Finance dashboard comes from here: pure functions
// over stored transactions. One classification (classifyTransaction) is
// used by every report, so a transaction can never count as spending in
// one chart and as a transfer in another.

export type FlowClass = "income" | "expense" | "transfer" | "exchange" | "debt";

export type ClassificationContext = Readonly<{
  categoriesById: ReadonlyMap<string, FinanceCategory>;
  // Transaction id -> kind of the link it belongs to.
  linkedKinds: ReadonlyMap<string, TransferLink["kind"]>;
}>;

export function buildClassificationContext(categories: ReadonlyArray<FinanceCategory>, links: ReadonlyArray<TransferLink>): ClassificationContext {
  const linkedKinds = new Map<string, TransferLink["kind"]>();

  for (const link of links) {
    linkedKinds.set(link.outgoingTransactionId, link.kind);
    linkedKinds.set(link.incomingTransactionId, link.kind);
  }

  return { categoriesById: new Map(categories.map((category) => [category.id, category])), linkedKinds };
}

// What a transaction MEANS, as opposed to its direction:
//   - linked to the other side of a move between own accounts: transfer
//     or exchange, whatever its category says;
//   - otherwise its category's kind;
//   - uncategorised: income if money came in, expense if it went out.
//     Until reviewed it is assumed genuine, and the UI says how many such
//     lines a total contains.
export function classifyTransaction(transaction: FinanceTransaction, context: ClassificationContext): FlowClass {
  const linkKind = context.linkedKinds.get(transaction.id);

  if (linkKind) return linkKind;

  const category = transaction.categoryId ? context.categoriesById.get(transaction.categoryId) : undefined;

  if (category) return category.kind;

  return transaction.amountMinor > 0 ? "income" : "expense";
}

// ---------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------

export const UNCATEGORISED_FILTER = "__uncategorised__";

export type FinanceFilters = Readonly<{
  start: IsoDate | null;
  end: IsoDate | null;
  accountId: string | null;
  currency: string | null;
  categoryId: string | null;
  flow: FlowClass | null;
  search: string;
}>;

export const EMPTY_FILTERS: FinanceFilters = { start: null, end: null, accountId: null, currency: null, categoryId: null, flow: null, search: "" };

export function filterTransactions(
  transactions: ReadonlyArray<FinanceTransaction>,
  filters: FinanceFilters,
  context: ClassificationContext,
): FinanceTransaction[] {
  const query = normalizeText(filters.search);

  return transactions.filter((transaction) => {
    if (!isWithin(transaction.bookedOn, filters.start, filters.end)) return false;
    if (filters.accountId && transaction.accountId !== filters.accountId) return false;
    if (filters.currency && transaction.currency !== filters.currency) return false;
    if (filters.categoryId === UNCATEGORISED_FILTER && transaction.categoryId !== null) return false;
    if (filters.categoryId && filters.categoryId !== UNCATEGORISED_FILTER && transaction.categoryId !== filters.categoryId) return false;
    if (filters.flow && classifyTransaction(transaction, context) !== filters.flow) return false;
    if (query && !normalizeText(`${transaction.merchant ?? ""} ${transaction.descriptionOriginal}`).includes(query)) return false;
    return true;
  });
}

// ---------------------------------------------------------------------
// Periods
// ---------------------------------------------------------------------

export type PeriodPreset = "this-month" | "last-month" | "this-quarter" | "this-year" | "last-12-months" | "all" | "custom";

export const PERIOD_LABELS: Readonly<Record<PeriodPreset, string>> = {
  "this-month": "This month",
  "last-month": "Last month",
  "this-quarter": "This quarter",
  "this-year": "This year",
  "last-12-months": "Last 12 months",
  all: "All time",
  custom: "Custom",
};

export function resolvePeriod(preset: PeriodPreset, today: IsoDate, custom: Readonly<{ start: IsoDate | null; end: IsoDate | null }>): Readonly<{ start: IsoDate | null; end: IsoDate | null }> {
  const month = monthKeyOf(today);

  switch (preset) {
    case "this-month":
      return { start: startOfMonth(month), end: endOfMonth(month) };
    case "last-month": {
      const previous = shiftMonth(month, -1);
      return { start: startOfMonth(previous), end: endOfMonth(previous) };
    }
    case "this-quarter": {
      const monthNumber = Number(month.slice(5, 7));
      const quarterStart = `${month.slice(0, 4)}-${String(monthNumber - ((monthNumber - 1) % 3)).padStart(2, "0")}`;
      return { start: startOfMonth(quarterStart), end: endOfMonth(shiftMonth(quarterStart, 2)) };
    }
    case "this-year":
      return { start: `${today.slice(0, 4)}-01-01`, end: `${today.slice(0, 4)}-12-31` };
    case "last-12-months":
      return { start: startOfMonth(shiftMonth(month, -11)), end: endOfMonth(month) };
    case "all":
      return { start: null, end: null };
    case "custom":
      return custom;
  }
}

// ---------------------------------------------------------------------
// Totals, per currency. Currencies are never added together.
// ---------------------------------------------------------------------

export type CurrencySummary = Readonly<{
  currency: string;
  incomeMinor: number;
  expenseMinor: number;
  // income - expense
  netMinor: number;
  debtMinor: number;
  transferredMinor: number;
  exchangedMinor: number;
  transactionCount: number;
  uncategorisedCount: number;
}>;

export function summarizeByCurrency(transactions: ReadonlyArray<FinanceTransaction>, context: ClassificationContext): CurrencySummary[] {
  const totals = new Map<string, { income: number; expense: number; debt: number; transferred: number; exchanged: number; count: number; uncategorised: number }>();

  for (const transaction of transactions) {
    const entry = totals.get(transaction.currency) ?? { income: 0, expense: 0, debt: 0, transferred: 0, exchanged: 0, count: 0, uncategorised: 0 };
    const flow = classifyTransaction(transaction, context);

    entry.count += 1;
    if (!transaction.categoryId && !context.linkedKinds.has(transaction.id)) entry.uncategorised += 1;

    // Signs: an expense-category refund (positive) reduces spending; an
    // income-category reversal (negative) reduces income.
    if (flow === "income") entry.income += transaction.amountMinor;
    else if (flow === "expense") entry.expense -= transaction.amountMinor;
    else if (flow === "debt") entry.debt -= transaction.amountMinor;
    else if (flow === "transfer") entry.transferred += Math.abs(transaction.amountMinor);
    else entry.exchanged += Math.abs(transaction.amountMinor);

    totals.set(transaction.currency, entry);
  }

  return [...totals.entries()]
    .map(([currency, entry]) => ({
      currency,
      incomeMinor: entry.income,
      expenseMinor: entry.expense,
      netMinor: entry.income - entry.expense,
      debtMinor: entry.debt,
      transferredMinor: entry.transferred,
      exchangedMinor: entry.exchanged,
      transactionCount: entry.count,
      uncategorisedCount: entry.uncategorised,
    }))
    .sort((first, second) => second.transactionCount - first.transactionCount || first.currency.localeCompare(second.currency));
}

export type CategoryTotal = Readonly<{
  categoryId: string | null;
  name: string;
  color: string;
  amountMinor: number;
  count: number;
}>;

const UNCATEGORISED_COLOR = "#64748b";

function totalsByCategory(
  transactions: ReadonlyArray<FinanceTransaction>,
  context: ClassificationContext,
  currency: string,
  flow: "income" | "expense",
): CategoryTotal[] {
  const totals = new Map<string | null, { amount: number; count: number }>();

  for (const transaction of transactions) {
    if (transaction.currency !== currency || classifyTransaction(transaction, context) !== flow) continue;
    const entry = totals.get(transaction.categoryId) ?? { amount: 0, count: 0 };
    entry.amount += flow === "expense" ? -transaction.amountMinor : transaction.amountMinor;
    entry.count += 1;
    totals.set(transaction.categoryId, entry);
  }

  return [...totals.entries()]
    .map(([categoryId, entry]) => {
      const category = categoryId ? context.categoriesById.get(categoryId) : undefined;
      return {
        categoryId,
        name: category?.name ?? "Needs review",
        color: category?.color ?? UNCATEGORISED_COLOR,
        amountMinor: entry.amount,
        count: entry.count,
      };
    })
    .sort((first, second) => second.amountMinor - first.amountMinor);
}

export function spendingByCategory(transactions: ReadonlyArray<FinanceTransaction>, context: ClassificationContext, currency: string): CategoryTotal[] {
  return totalsByCategory(transactions, context, currency, "expense");
}

export function incomeByCategory(transactions: ReadonlyArray<FinanceTransaction>, context: ClassificationContext, currency: string): CategoryTotal[] {
  return totalsByCategory(transactions, context, currency, "income");
}

export type SourceTotal = Readonly<{ name: string; amountMinor: number; count: number }>;

// Who the income came from, by merchant/counterparty name.
export function incomeBySource(transactions: ReadonlyArray<FinanceTransaction>, context: ClassificationContext, currency: string, limit = 6): SourceTotal[] {
  const totals = new Map<string, { name: string; amount: number; count: number }>();

  for (const transaction of transactions) {
    if (transaction.currency !== currency || classifyTransaction(transaction, context) !== "income") continue;
    const name = transaction.merchant?.trim() || transaction.descriptionOriginal.split(" · ")[0];
    const key = normalizeText(name);
    const entry = totals.get(key) ?? { name, amount: 0, count: 0 };
    entry.amount += transaction.amountMinor;
    entry.count += 1;
    totals.set(key, entry);
  }

  return [...totals.values()]
    .map((entry) => ({ name: entry.name, amountMinor: entry.amount, count: entry.count }))
    .sort((first, second) => second.amountMinor - first.amountMinor)
    .slice(0, limit);
}

export type MonthlyPoint = Readonly<{ month: MonthKey; incomeMinor: number; expenseMinor: number }>;

export function monthlyTrend(transactions: ReadonlyArray<FinanceTransaction>, context: ClassificationContext, currency: string, months: ReadonlyArray<MonthKey>): MonthlyPoint[] {
  const points = new Map(months.map((month) => [month, { income: 0, expense: 0 }]));

  for (const transaction of transactions) {
    if (transaction.currency !== currency) continue;
    const point = points.get(monthKeyOf(transaction.bookedOn));
    if (!point) continue;
    const flow = classifyTransaction(transaction, context);
    if (flow === "income") point.income += transaction.amountMinor;
    if (flow === "expense") point.expense -= transaction.amountMinor;
  }

  return months.map((month) => ({ month, incomeMinor: points.get(month)!.income, expenseMinor: points.get(month)!.expense }));
}

// The months a trend chart should show for a period: the period's own
// months, or the last 6 when the period is open-ended or a single month.
export function trendMonths(start: IsoDate | null, end: IsoDate | null, today: IsoDate): MonthKey[] {
  const last = monthKeyOf(end && end < today ? end : today);
  const months = start ? monthsInRange(start, end ?? today) : [];
  if (months.length >= 3 && months.length <= 24) return months;
  return Array.from({ length: 6 }, (_, index) => shiftMonth(last, index - 5));
}

// ---------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------

// How many months a period spans, counting partial months by their share
// of days: Jan 1 - Mar 31 is 3, Oct 1 - Oct 15 is 15/31.
export function monthsSpanned(start: IsoDate, end: IsoDate): number {
  if (end < start) return 0;

  return monthsInRange(start, end).reduce((total, month) => {
    const year = Number(month.slice(0, 4));
    const monthNumber = Number(month.slice(5, 7));
    const from = start > startOfMonth(month) ? start : startOfMonth(month);
    const to = end < endOfMonth(month) ? end : endOfMonth(month);
    return total + (daysBetween(from, to) + 1) / daysInMonth(year, monthNumber);
  }, 0);
}

export type BudgetRow = Readonly<{
  budget: Budget;
  category: FinanceCategory | null;
  budgetMinor: number;
  actualMinor: number;
  remainingMinor: number;
  // 0-100+, actual / budget.
  percentUsed: number;
  isOver: boolean;
}>;

export function budgetVsActual(
  budgets: ReadonlyArray<Budget>,
  transactions: ReadonlyArray<FinanceTransaction>,
  context: ClassificationContext,
  period: Readonly<{ start: IsoDate; end: IsoDate }>,
): BudgetRow[] {
  const months = monthsSpanned(period.start, period.end);

  return budgets
    .map((budget) => {
      const category = context.categoriesById.get(budget.categoryId) ?? null;
      const budgetMinor = Math.round(budget.monthlyAmountMinor * months);
      const actualMinor = transactions
        .filter(
          (transaction) =>
            transaction.categoryId === budget.categoryId &&
            transaction.currency === budget.currency &&
            isWithin(transaction.bookedOn, period.start, period.end) &&
            !context.linkedKinds.has(transaction.id),
        )
        .reduce((total, transaction) => total - transaction.amountMinor, 0);

      return {
        budget,
        category,
        budgetMinor,
        actualMinor,
        remainingMinor: budgetMinor - actualMinor,
        percentUsed: budgetMinor > 0 ? Math.round((actualMinor / budgetMinor) * 100) : 0,
        isOver: actualMinor > budgetMinor,
      };
    })
    .sort((first, second) => second.percentUsed - first.percentUsed);
}

// ---------------------------------------------------------------------
// Balances
// ---------------------------------------------------------------------

export type AccountBalance = Readonly<{
  account: FinanceAccount;
  balanceMinor: number | null;
  asOf: IsoDate | null;
  // statement: the last statement's closing balance (plus anything booked
  // after it); transactions: no statement balance is known, so this is the
  // sum of recorded lines and the true opening balance is missing.
  basis: "statement" | "transactions" | "none";
}>;

export function computeAccountBalances(
  accounts: ReadonlyArray<FinanceAccount>,
  statements: ReadonlyArray<Statement>,
  transactions: ReadonlyArray<FinanceTransaction>,
): AccountBalance[] {
  return accounts.map((account) => {
    const own = transactions.filter((transaction) => transaction.accountId === account.id);
    const latest = statements
      .filter((statement) => statement.accountId === account.id && statement.closingBalanceMinor !== null && statement.periodEnd)
      .sort((first, second) => (second.periodEnd as string).localeCompare(first.periodEnd as string))[0];

    if (latest) {
      const after = own.filter((transaction) => transaction.bookedOn > (latest.periodEnd as string));
      const lastDate = after.reduce((max, transaction) => (transaction.bookedOn > max ? transaction.bookedOn : max), latest.periodEnd as string);
      return {
        account,
        balanceMinor: (latest.closingBalanceMinor as number) + after.reduce((total, transaction) => total + transaction.amountMinor, 0),
        asOf: lastDate,
        basis: "statement" as const,
      };
    }

    if (own.length === 0) {
      return { account, balanceMinor: null, asOf: null, basis: "none" as const };
    }

    return {
      account,
      balanceMinor: own.reduce((total, transaction) => total + transaction.amountMinor, 0),
      asOf: own.reduce((max, transaction) => (transaction.bookedOn > max ? transaction.bookedOn : max), own[0].bookedOn),
      basis: "transactions" as const,
    };
  });
}

export function totalBalancesByCurrency(balances: ReadonlyArray<AccountBalance>): Array<Readonly<{ currency: string; balanceMinor: number; accountCount: number }>> {
  const totals = new Map<string, { balance: number; count: number }>();

  for (const entry of balances) {
    if (entry.balanceMinor === null || entry.account.isArchived) continue;
    const total = totals.get(entry.account.currency) ?? { balance: 0, count: 0 };
    total.balance += entry.balanceMinor;
    total.count += 1;
    totals.set(entry.account.currency, total);
  }

  return [...totals.entries()].map(([currency, total]) => ({ currency, balanceMinor: total.balance, accountCount: total.count }));
}

export function currenciesOf(transactions: ReadonlyArray<FinanceTransaction>, accounts: ReadonlyArray<FinanceAccount>): string[] {
  return [...new Set([...accounts.map((account) => account.currency), ...transactions.map((transaction) => transaction.currency)])].sort();
}

