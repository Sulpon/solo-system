import { parseNumericDate, parsePeriodSentence, type IsoDate } from "../dates";
import { parseAmount } from "../money";
import type { PdfDocumentText, PdfLine } from "../pdf/lines";
import { cleanMerchantName, maskAccountNumber } from "../text";
import { firstItemX, firstPageHeader, joinDescription, memoizeByDocument } from "./shared";
import type { ParsedStatement, ParsedTransaction, StatementAccountInfo, StatementBalances, StatementIssue, StatementParser } from "./types";

// АО "Alatau City Bank" (formerly Jusan Bank, BIC TSESKZKA) card account
// statements, as exported from internet banking.
//
// Verified against a real multi-currency card statement (KZT, USD, EUR
// accounts in one file).
//
// LAYOUT, AS VERIFIED
//
// One block per currency account:
//
//   KZ00000PB00000001111   KZT          <- account number + currency
//   Остаток на 01.01.2023               <- opening; value on the NEXT line
//   79.47
//   Пополнения 193 500                  <- money in
//   Переводы / Покупки / Снятия /       <- money out, by type
//   Комиссия / Прочие
//   Остаток на 31.12.2023               <- closing; value on the next line
//   200
//   Сумма в обработке / Общий остаток   <- as of the export date: ignored
//   Транзакции по счету: KZ... KZT      <- that account's lines
//
// A line: date | operation | details | amount | op. currency | in | out,
// newest first. The last four cells are always amount, currency, in, out;
// the in/out pair is in the ACCOUNT's currency and decides the sign.
// "Референс:" lines carry the bank reference. Note that a transfer and its
// commission share one reference, so the reference alone is not a unique
// transaction id (see dedupe.ts).

const ACCOUNT_HEADER = /^KZ[0-9A-Z]{16,30}$/;
const MONEY_OUT_LABELS = new Set(["Переводы", "Покупки", "Снятия", "Комиссия", "Прочие"]);

type DraftTransaction = {
  bookedOn: IsoDate;
  operation: string;
  details: string[];
  reference: string | null;
  amountMinor: number;
  originalAmountMinor: number | null;
  originalCurrency: string | null;
  detailsX: number;
};

type Block = {
  accountNumber: string;
  currency: string;
  opening: number | null;
  closing: number | null;
  credits: number | null;
  debits: number | null;
  transactions: DraftTransaction[];
};

type AlatauSection = Readonly<{
  account: StatementAccountInfo;
  balances: StatementBalances;
  transactions: ParsedTransaction[];
}>;

function readTrailingAmount(line: PdfLine, currency: string): number | null {
  const last = line.items[line.items.length - 1];
  if (!last || line.items.length < 2 || last.x < 180) return null;
  return parseAmount(last.text, currency)?.minor ?? null;
}

function readTransactionRow(line: PdfLine, currency: string): DraftTransaction | null {
  const items = line.items;
  // date, operation, [details...], amount, currency, in, out
  if (items.length < 6) return null;

  const bookedOn = parseNumericDate(items[0].text);
  if (!bookedOn) return null;

  const tail = items.slice(-4);
  const operationCurrency = tail[1].text;

  if (!/^[A-Z]{3}$/.test(operationCurrency)) return null;

  const operationAmount = parseAmount(tail[0].text, operationCurrency);
  const credit = parseAmount(tail[2].text, currency);
  const debit = parseAmount(tail[3].text, currency);

  if (!operationAmount || !credit || !debit) return null;

  const amountMinor = Math.abs(credit.minor) - Math.abs(debit.minor);
  const detailItems = items.slice(2, -4);

  return {
    bookedOn,
    operation: items[1].text,
    details: detailItems.map((item) => item.text),
    reference: null,
    amountMinor,
    originalAmountMinor: operationCurrency !== currency ? (amountMinor < 0 ? -1 : 1) * Math.abs(operationAmount.minor) : null,
    originalCurrency: operationCurrency !== currency ? operationCurrency : null,
    // With an empty details cell, continuation lines still sit roughly
    // one column right of the operation.
    detailsX: detailItems[0]?.x ?? items[1].x + 70,
  };
}

function segment(document: PdfDocumentText): Readonly<{ sections: AlatauSection[]; period: Readonly<{ start: IsoDate; end: IsoDate }> | null; zeroAmountLines: number }> {
  const blocks = new Map<string, Block>();
  let period: Readonly<{ start: IsoDate; end: IsoDate }> | null = null;
  let summaryBlock: Block | null = null;
  // Which balance the next lone number belongs to.
  let awaiting: "opening" | "closing" | "ignore" | null = null;
  let transactionBlock: Block | null = null;
  let current: DraftTransaction | null = null;
  let zeroAmountLines = 0;

  const blockFor = (accountNumber: string, currency: string): Block => {
    const key = `${accountNumber}|${currency}`;
    let block = blocks.get(key);
    if (!block) {
      block = { accountNumber, currency, opening: null, closing: null, credits: null, debits: null, transactions: [] };
      blocks.set(key, block);
    }
    return block;
  };

  for (const line of document.lines) {
    const items = line.items;
    const first = items[0]?.text ?? "";

    if (!period && /^За период:?$/.test(first) && items[1]) {
      period = parsePeriodSentence(items[1].text);
      continue;
    }

    // Summary block header: "KZ00000PB00000001111   KZT"
    if (items.length === 2 && ACCOUNT_HEADER.test(first) && /^[A-Z]{3}$/.test(items[1].text)) {
      summaryBlock = blockFor(first, items[1].text);
      transactionBlock = null;
      current = null;
      awaiting = null;
      continue;
    }

    const transactionsTitle = /^Транзакции по сч[её]ту:\s*(KZ[0-9A-Z]{16,30})\s+([A-Z]{3})$/.exec(line.text.trim());
    if (transactionsTitle) {
      transactionBlock = blockFor(transactionsTitle[1], transactionsTitle[2]);
      summaryBlock = null;
      current = null;
      awaiting = null;
      continue;
    }

    if (summaryBlock) {
      const block: Block = summaryBlock;

      if (/^(Остаток на|Общий остаток на|Сумма в обработке на)$/.test(first)) {
        const inline = readTrailingAmount(line, block.currency);
        const target = first === "Остаток на" ? (block.opening === null ? "opening" : "closing") : "ignore";

        if (inline !== null && items.length >= 3) {
          if (target === "opening") block.opening = inline;
          if (target === "closing") block.closing = inline;
          awaiting = null;
        } else {
          awaiting = target;
        }
        continue;
      }

      if (awaiting && items.length === 1 && items[0].x > 180) {
        const value = parseAmount(items[0].text, block.currency);
        if (value) {
          if (awaiting === "opening") block.opening = value.minor;
          if (awaiting === "closing") block.closing = value.minor;
          awaiting = null;
        }
        continue;
      }

      if (first === "Пополнения" || MONEY_OUT_LABELS.has(first)) {
        const value = readTrailingAmount(line, block.currency);
        if (value !== null) {
          if (first === "Пополнения") block.credits = (block.credits ?? 0) + value;
          else block.debits = (block.debits ?? 0) + value;
        }
      }
      continue;
    }

    if (!transactionBlock) continue;

    const row = readTransactionRow(line, transactionBlock.currency);

    if (row) {
      if (row.amountMinor === 0) {
        zeroAmountLines += 1;
        current = null;
        continue;
      }
      transactionBlock.transactions.push(row);
      current = row;
      continue;
    }

    // Continuation lines sit under the details column.
    if (current && Math.abs(firstItemX(line) - current.detailsX) <= 8) {
      const reference = /^Референс:\s*(.+)$/.exec(first);
      if (reference) {
        current.reference = reference[1].trim();
      } else if (!/^Код авторизации:/.test(first)) {
        current.details.push(line.text);
      }
    }
  }

  const sections: AlatauSection[] = [...blocks.values()].map((block) => ({
    account: {
      bankName: "Alatau City Bank",
      accountIdentifier: maskAccountNumber(block.accountNumber),
      currency: block.currency,
      product: "current",
      suggestedName: `Alatau City Bank ${block.currency}`,
    },
    balances: {
      periodStart: period?.start ?? null,
      periodEnd: period?.end ?? null,
      openingBalanceMinor: block.opening,
      closingBalanceMinor: block.closing,
      reportedCreditsMinor: block.credits,
      reportedDebitsMinor: block.debits,
    },
    // The statement lists newest first; store oldest first like every
    // other source.
    transactions: [...block.transactions].reverse().map((draft) => {
      const detailText = draft.details.join(" ");
      return {
        bookedOn: draft.bookedOn,
        postedOn: null,
        description: joinDescription([draft.operation, detailText]),
        merchant: cleanMerchantName(detailText.replace(/:\s*\S*\(\d+\)/, "")) || null,
        amountMinor: draft.amountMinor,
        currency: block.currency,
        originalAmountMinor: draft.originalAmountMinor,
        originalCurrency: draft.originalCurrency,
        feeMinor: null,
        reference: draft.reference,
        balanceAfterMinor: null,
      };
    }),
  }));

  return { sections, period, zeroAmountLines };
}

const segmentAlatau = memoizeByDocument(segment);

export const alatauParser: StatementParser = {
  id: "alatau",
  bankName: "Alatau City Bank",
  verifiedFormats: ["Alatau City Bank card statement PDF (Russian, multi-currency)"],

  detectStatement(document) {
    const header = firstPageHeader(document, 15);
    return /Alatau City Bank/i.test(header) || (/TSESKZKA/.test(header) && /Выписка/i.test(header));
  },

  extractAccountInfo(document) {
    return segmentAlatau(document).sections.map((section) => section.account);
  },

  extractStatementBalances(document) {
    return segmentAlatau(document).sections.map((section) => section.balances);
  },

  extractTransactions(document) {
    return segmentAlatau(document).sections.map((section) => section.transactions);
  },

  validateStatement(statement: ParsedStatement): StatementIssue[] {
    // Re-segmenting is free (memoised) and gives access to what the
    // generic ParsedStatement does not carry.
    return statement.sections.length === 0
      ? [{ severity: "error", code: "no_accounts", message: "No account blocks were found in this Alatau City Bank statement.", sectionIndex: null, transactionIndex: null }]
      : [];
  },
};

// Exposed for the parser's own tests.
export function countSkippedZeroAmountLines(document: PdfDocumentText): number {
  return segmentAlatau(document).zeroAmountLines;
}
