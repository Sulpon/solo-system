import { classifyTransaction, type ClassificationContext } from "./analytics";
import { minorToMajorString } from "./money";
import type { FinanceAccount, FinanceTransaction } from "./types";

// CSV export of transactions, re-importable by the CSV import (same
// column names). Text cells that a spreadsheet would execute as a formula
// are prefixed with an apostrophe.

function escapeCell(value: string, isText: boolean): string {
  const safe = isText && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function exportTransactionsCsv(
  transactions: ReadonlyArray<FinanceTransaction>,
  accounts: ReadonlyArray<FinanceAccount>,
  context: ClassificationContext,
): string {
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const header = ["date", "merchant", "description", "amount", "currency", "account", "category", "type", "categorisation", "review", "reference", "source", "created"];

  const rows = transactions.map((transaction) => {
    const category = transaction.categoryId ? context.categoriesById.get(transaction.categoryId)?.name ?? "" : "";
    const cells: Array<[string, boolean]> = [
      [transaction.bookedOn, false],
      [transaction.merchant ?? "", true],
      [transaction.descriptionOriginal, true],
      [minorToMajorString(transaction.amountMinor, transaction.currency), false],
      [transaction.currency, false],
      [accountNames.get(transaction.accountId) ?? "", true],
      [category, true],
      [classifyTransaction(transaction, context), false],
      [transaction.categorizationMethod, false],
      [transaction.reviewStatus, false],
      [transaction.bankReference ?? "", true],
      [transaction.source, false],
      [transaction.createdAt, false],
    ];
    return cells.map(([value, isText]) => escapeCell(value, isText)).join(",");
  });

  return [header.join(","), ...rows].join("\r\n") + "\r\n";
}
