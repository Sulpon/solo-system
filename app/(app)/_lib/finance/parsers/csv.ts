import { parseNumericDate, parseAnyDate, type IsoDate, type NumericDateOrder } from "../dates";
import { isCurrencyCode, parseAmount } from "../money";
import { reconciliationIssues } from "../reconciliation";
import { cleanMerchantName } from "../text";
import { joinDescription } from "./shared";
import { StatementParseError, type ParsedStatement, type ParsedTransaction } from "./types";

// Manual CSV import: the fallback for any bank without a PDF parser.
//
// One header row, then one transaction per row. Columns are found by name
// (English or Russian), so most bank and spreadsheet exports work without
// editing:
//
//   required  date, description, and EITHER amount (signed)
//             OR debit + credit (unsigned)
//   optional  currency, merchant, reference, balance
//
// Without a currency column every row must use the currency chosen in the
// import form.

export const CSV_MAX_ROWS = 20_000;

const COLUMN_ALIASES: Readonly<Record<string, ReadonlyArray<string>>> = {
  date: ["date", "booking date", "transaction date", "completed date", "started date", "дата", "дата операции", "дата проведения"],
  description: ["description", "details", "narrative", "memo", "описание", "назначение", "детали", "описание операции"],
  amount: ["amount", "sum", "value", "сумма", "сумма операции"],
  debit: ["debit", "money out", "paid out", "withdrawal", "расход", "списание", "списания"],
  credit: ["credit", "money in", "paid in", "deposit", "приход", "пополнение", "пополнения"],
  currency: ["currency", "валюта", "ccy"],
  merchant: ["merchant", "payee", "counterparty", "получатель", "контрагент"],
  reference: ["reference", "ref", "transaction id", "id", "референс", "номер документа"],
  balance: ["balance", "остаток", "баланс"],
};

export function detectDelimiter(headerLine: string): string {
  const candidates = [",", ";", "\t", "|"];
  return candidates.reduce((best, candidate) => (headerLine.split(candidate).length > headerLine.split(best).length ? candidate : best), ",");
}

// RFC 4180 rows: quoted fields may contain the delimiter, newlines and
// doubled quotes.
export function parseCsvRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }

    if (rows.length > CSV_MAX_ROWS + 1) {
      throw new StatementParseError("inconsistent", `CSV files are limited to ${CSV_MAX_ROWS.toLocaleString("en-GB")} rows.`);
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((candidate) => candidate.some((cell) => cell.trim() !== ""));
}

function findColumn(headers: ReadonlyArray<string>, key: keyof typeof COLUMN_ALIASES): number {
  const normalized = headers.map((header) => header.trim().toLowerCase().replace(/^﻿/, ""));
  return normalized.findIndex((header) => COLUMN_ALIASES[key].includes(header));
}

export type CsvImportOptions = Readonly<{
  defaultCurrency: string;
  dateOrder: NumericDateOrder;
  accountName: string;
}>;

export function parseCsvStatement(text: string, options: CsvImportOptions): ParsedStatement {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const rows = parseCsvRows(text, detectDelimiter(firstLine));

  if (rows.length < 2) {
    throw new StatementParseError("no_transactions", "The CSV file has no transaction rows under its header.");
  }

  const headers = rows[0];
  const column = {
    date: findColumn(headers, "date"),
    description: findColumn(headers, "description"),
    amount: findColumn(headers, "amount"),
    debit: findColumn(headers, "debit"),
    credit: findColumn(headers, "credit"),
    currency: findColumn(headers, "currency"),
    merchant: findColumn(headers, "merchant"),
    reference: findColumn(headers, "reference"),
    balance: findColumn(headers, "balance"),
  };

  const hasAmount = column.amount !== -1 || (column.debit !== -1 && column.credit !== -1);

  if (column.date === -1 || column.description === -1 || !hasAmount) {
    throw new StatementParseError(
      "unrecognized",
      "The CSV needs a header row with a date column, a description column, and either an amount column or debit and credit columns.",
    );
  }

  if (column.currency === -1 && !isCurrencyCode(options.defaultCurrency)) {
    throw new StatementParseError("unrecognized", "Choose the currency for this CSV: it has no currency column.");
  }

  const byCurrency = new Map<string, ParsedTransaction[]>();
  const rowErrors: string[] = [];

  rows.slice(1).forEach((cells, offset) => {
    const lineNumber = offset + 2;
    const cell = (index: number) => (index === -1 ? "" : (cells[index] ?? "").trim());
    const currency = (cell(column.currency) || options.defaultCurrency).toUpperCase();

    if (!isCurrencyCode(currency)) {
      rowErrors.push(`Row ${lineNumber}: unknown currency.`);
      return;
    }

    const bookedOn: IsoDate | null = parseNumericDate(cell(column.date), options.dateOrder) ?? parseAnyDate(cell(column.date), options.dateOrder);

    if (!bookedOn) {
      rowErrors.push(`Row ${lineNumber}: the date could not be read.`);
      return;
    }

    let amountMinor: number | null = null;

    if (column.amount !== -1 && cell(column.amount)) {
      amountMinor = parseAmount(cell(column.amount), currency)?.minor ?? null;
    } else {
      const debit = cell(column.debit) ? parseAmount(cell(column.debit), currency) : { minor: 0, currency };
      const credit = cell(column.credit) ? parseAmount(cell(column.credit), currency) : { minor: 0, currency };
      amountMinor = debit && credit ? Math.abs(credit.minor) - Math.abs(debit.minor) : null;
    }

    if (amountMinor === null) {
      rowErrors.push(`Row ${lineNumber}: the amount could not be read.`);
      return;
    }

    if (amountMinor === 0) {
      return;
    }

    const description = cell(column.description);

    if (!description) {
      rowErrors.push(`Row ${lineNumber}: the description is empty.`);
      return;
    }

    const merchant = cleanMerchantName(cell(column.merchant) || description);
    const balance = cell(column.balance) ? (parseAmount(cell(column.balance), currency)?.minor ?? null) : null;
    const list = byCurrency.get(currency) ?? [];

    list.push({
      bookedOn,
      postedOn: null,
      description: joinDescription([description]),
      merchant: merchant || null,
      amountMinor,
      currency,
      originalAmountMinor: null,
      originalCurrency: null,
      feeMinor: null,
      reference: cell(column.reference) || null,
      balanceAfterMinor: balance,
    });
    byCurrency.set(currency, list);
  });

  if (rowErrors.length > 0) {
    // Never import a partially-read file: every row must parse, or the
    // user fixes the file. The first few problems are enough to act on.
    throw new StatementParseError("inconsistent", `Some rows could not be read. ${rowErrors.slice(0, 5).join(" ")}${rowErrors.length > 5 ? ` (${rowErrors.length - 5} more)` : ""}`);
  }

  if (byCurrency.size === 0) {
    throw new StatementParseError("no_transactions", "The CSV contains no non-zero transactions.");
  }

  const sections = [...byCurrency.entries()].map(([currency, transactions], index) => {
    // Newest-first exports are reversed rather than re-sorted, so lines on
    // the same day keep the bank's order (and running balances still chain).
    const descending = transactions.length > 1 && transactions[0].bookedOn > transactions[transactions.length - 1].bookedOn;
    const sorted = descending ? [...transactions].reverse() : transactions;
    return {
      index,
      account: {
        bankName: "CSV import",
        accountIdentifier: null,
        currency,
        product: "current",
        suggestedName: byCurrency.size > 1 ? `${options.accountName} ${currency}` : options.accountName,
      },
      balances: {
        periodStart: sorted[0]?.bookedOn ?? null,
        periodEnd: sorted[sorted.length - 1]?.bookedOn ?? null,
        openingBalanceMinor: null,
        closingBalanceMinor: null,
        reportedCreditsMinor: null,
        reportedDebitsMinor: null,
      },
      transactions: sorted,
    };
  });

  return {
    parserId: "csv",
    bankName: "CSV import",
    sections,
    issues: sections.flatMap((section) => reconciliationIssues(section)).filter((issue) => issue.code !== "balances_missing"),
  };
}
