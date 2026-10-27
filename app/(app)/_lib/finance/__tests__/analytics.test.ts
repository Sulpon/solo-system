import { describe, expect, it } from "vitest";
import {
  budgetVsActual,
  buildClassificationContext,
  classifyTransaction,
  computeAccountBalances,
  filterTransactions,
  monthsSpanned,
  monthlyTrend,
  resolvePeriod,
  spendingByCategory,
  summarizeByCurrency,
  totalBalancesByCurrency,
  EMPTY_FILTERS,
} from "../analytics";
import { reconcile } from "../reconciliation";
import { suggestTransferPairs, validateTransferLink } from "../transfers";
import type { Statement, TransferLink } from "../types";
import { account, CATEGORIES, categoryId, transaction } from "./helpers";

const link = (outgoing: string, incoming: string, kind: TransferLink["kind"] = "transfer"): TransferLink => ({
  id: `link-${outgoing}`,
  outgoingTransactionId: outgoing,
  incomingTransactionId: incoming,
  kind,
  createdAt: "2026-10-01T00:00:00Z",
});

describe("income and expense totals", () => {
  const salary = transaction({ amountMinor: 300000, categoryId: categoryId("salary") });
  const groceries = transaction({ amountMinor: -4500, categoryId: categoryId("groceries") });
  const refund = transaction({ amountMinor: 1000, categoryId: categoryId("groceries") });
  const ownOut = transaction({ amountMinor: -50000, accountId: "acc-1" });
  const ownIn = transaction({ amountMinor: 50000, accountId: "acc-2" });
  const exchange = transaction({ amountMinor: -10000, categoryId: categoryId("currency-exchange") });
  const loan = transaction({ amountMinor: -20000, categoryId: categoryId("debt-payments") });
  const unknownIn = transaction({ amountMinor: 700 });
  const unknownOut = transaction({ amountMinor: -300 });
  const all = [salary, groceries, refund, ownOut, ownIn, exchange, loan, unknownIn, unknownOut];
  const context = buildClassificationContext(CATEGORIES, [link(ownOut.id, ownIn.id)]);

  it("excludes linked own-account transfers and currency exchange; keeps debt separate", () => {
    const [eur] = summarizeByCurrency(all, context);
    expect(eur.incomeMinor).toBe(300000 + 700);
    expect(eur.expenseMinor).toBe(4500 - 1000 + 300);
    expect(eur.netMinor).toBe(eur.incomeMinor - eur.expenseMinor);
    expect(eur.debtMinor).toBe(20000);
    expect(eur.transferredMinor).toBe(100000);
    expect(eur.exchangedMinor).toBe(10000);
    expect(eur.uncategorisedCount).toBe(2);
  });

  it("classifies a linked line as a transfer whatever its category", () => {
    const linkedGrocery = transaction({ amountMinor: -50000, categoryId: categoryId("groceries") });
    expect(classifyTransaction(linkedGrocery, buildClassificationContext(CATEGORIES, [link(linkedGrocery.id, "x")]))).toBe("transfer");
  });

  it("never adds different currencies together", () => {
    const summaries = summarizeByCurrency([transaction({ amountMinor: -1000, currency: "EUR" }), transaction({ amountMinor: -500000, currency: "KZT" })], context);
    expect(summaries.map((summary) => [summary.currency, summary.expenseMinor]).sort()).toEqual([
      ["EUR", 1000],
      ["KZT", 500000],
    ]);
  });

  it("totals spending by category per currency, net of refunds", () => {
    const rows = spendingByCategory(all, context, "EUR");
    expect(rows.find((row) => row.categoryId === categoryId("groceries"))?.amountMinor).toBe(3500);
    expect(rows.find((row) => row.categoryId === null)?.name).toBe("Needs review");
  });

  it("does not double count when the same transaction is in several reports", () => {
    const byCategory = spendingByCategory(all, context, "EUR").reduce((sum, row) => sum + row.amountMinor, 0);
    const [eur] = summarizeByCurrency(all, context);
    const [trend] = monthlyTrend(all, context, "EUR", ["2026-10"]);
    expect(byCategory).toBe(eur.expenseMinor);
    expect(trend.expenseMinor).toBe(eur.expenseMinor);
  });
});

describe("filters and periods", () => {
  const context = buildClassificationContext(CATEGORIES, []);

  it("includes both boundary days of a period", () => {
    const transactions = [transaction({ bookedOn: "2026-09-30" }), transaction({ bookedOn: "2026-10-01" }), transaction({ bookedOn: "2026-10-31" }), transaction({ bookedOn: "2026-11-01" })];
    const period = resolvePeriod("this-month", "2026-10-15", { start: null, end: null });
    expect(period).toEqual({ start: "2026-10-01", end: "2026-10-31" });
    expect(filterTransactions(transactions, { ...EMPTY_FILTERS, ...period }, context).map((item) => item.bookedOn)).toEqual(["2026-10-01", "2026-10-31"]);
  });

  it("resolves quarters, last month across a year boundary, and years", () => {
    expect(resolvePeriod("this-quarter", "2026-11-05", { start: null, end: null })).toEqual({ start: "2026-10-01", end: "2026-12-31" });
    expect(resolvePeriod("last-month", "2026-01-10", { start: null, end: null })).toEqual({ start: "2025-12-01", end: "2025-12-31" });
    expect(resolvePeriod("this-year", "2026-06-01", { start: null, end: null })).toEqual({ start: "2026-01-01", end: "2026-12-31" });
  });

  it("searches merchant and description, and filters by type", () => {
    const coffee = transaction({ merchant: "Café Example", categoryId: categoryId("coffee") });
    const pay = transaction({ amountMinor: 1000, descriptionOriginal: "Платеж от EXAMPLE" });
    expect(filterTransactions([coffee, pay], { ...EMPTY_FILTERS, search: "cafe" }, context)).toEqual([coffee]);
    expect(filterTransactions([coffee, pay], { ...EMPTY_FILTERS, flow: "income" }, context)).toEqual([pay]);
  });
});

describe("budgets", () => {
  const context = buildClassificationContext(CATEGORIES, []);
  const budget = { id: "b1", categoryId: categoryId("groceries"), currency: "EUR", monthlyAmountMinor: 30000 };

  it("scales monthly budgets to quarters and partial months", () => {
    expect(monthsSpanned("2026-10-01", "2026-12-31")).toBeCloseTo(3);
    expect(monthsSpanned("2026-10-01", "2026-10-31")).toBe(1);
    expect(monthsSpanned("2026-10-01", "2026-10-15")).toBeCloseTo(15 / 31);
  });

  it("reports actual, remaining and overspending in the budget's currency only", () => {
    const rows = budgetVsActual(
      [budget],
      [transaction({ amountMinor: -25000, categoryId: categoryId("groceries") }), transaction({ amountMinor: -10000, categoryId: categoryId("groceries") }), transaction({ amountMinor: -99999, currency: "KZT", categoryId: categoryId("groceries") })],
      context,
      { start: "2026-10-01", end: "2026-10-31" },
    );
    expect(rows[0]).toMatchObject({ budgetMinor: 30000, actualMinor: 35000, remainingMinor: -5000, percentUsed: 117, isOver: true });
  });
});

describe("balances and reconciliation", () => {
  const statement: Statement = {
    id: "s1",
    importId: "i1",
    sectionIndex: 0,
    accountId: "acc-1",
    currency: "EUR",
    periodStart: "2026-10-01",
    periodEnd: "2026-10-31",
    openingBalanceMinor: 1000,
    closingBalanceMinor: 5000,
    creditsMinor: 0,
    debitsMinor: 0,
    reconciliationStatus: "balanced",
    reconciliationDifferenceMinor: 0,
  };

  it("uses the latest statement's closing balance plus anything booked after it", () => {
    const balances = computeAccountBalances(
      [account(), account({ id: "acc-2", currency: "KZT" })],
      [statement],
      [transaction({ bookedOn: "2026-10-15", amountMinor: -100 }), transaction({ bookedOn: "2026-11-02", amountMinor: -700 }), transaction({ accountId: "acc-2", amountMinor: 900000, currency: "KZT" })],
    );
    expect(balances[0]).toMatchObject({ balanceMinor: 4300, asOf: "2026-11-02", basis: "statement" });
    expect(balances[1]).toMatchObject({ balanceMinor: 900000, basis: "transactions" });
    expect(totalBalancesByCurrency(balances)).toEqual([
      { currency: "EUR", balanceMinor: 4300, accountCount: 1 },
      { currency: "KZT", balanceMinor: 900000, accountCount: 1 },
    ]);
  });

  it("reports the exact reconciliation difference and never adjusts", () => {
    expect(reconcile(1000, 1500, [700, -200])).toMatchObject({ status: "balanced", differenceMinor: 0, creditsMinor: 700, debitsMinor: 200 });
    expect(reconcile(1000, 1600, [700, -200])).toMatchObject({ status: "mismatch", differenceMinor: 100, expectedClosingMinor: 1500 });
    expect(reconcile(null, 1600, [700])).toMatchObject({ status: "unverifiable", differenceMinor: null });
  });
});

describe("internal transfers", () => {
  const out = transaction({ accountId: "acc-1", amountMinor: -50000, bookedOn: "2026-10-01", categoryId: categoryId("own-transfers") });
  const into = transaction({ accountId: "acc-2", amountMinor: 50000, bookedOn: "2026-10-02" });

  it("validates both sides of a link", () => {
    expect(validateTransferLink(out, into, "transfer")).toBeNull();
    expect(validateTransferLink(into, out, "transfer")).toMatch(/outgoing/);
    expect(validateTransferLink(out, { ...into, accountId: "acc-1" }, "transfer")).toMatch(/different accounts/);
    expect(validateTransferLink(out, { ...into, currency: "KZT" }, "transfer")).toMatch(/exchange/);
  });

  it("suggests a pair only when one side is already marked as a movement", () => {
    expect(suggestTransferPairs([out, into], [], CATEGORIES)).toHaveLength(1);
    const plainOut = { ...out, categoryId: null };
    expect(suggestTransferPairs([plainOut, into], [], CATEGORIES)).toHaveLength(0);
  });

  it("does not suggest already linked or distant lines", () => {
    expect(suggestTransferPairs([out, into], [link(out.id, into.id)], CATEGORIES)).toHaveLength(0);
    expect(suggestTransferPairs([out, { ...into, bookedOn: "2026-10-09" }], [], CATEGORIES)).toHaveLength(0);
  });
});
