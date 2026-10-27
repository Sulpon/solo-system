import { parseEnglishDate, parsePeriodSentence, parseRussianDate, type IsoDate } from "../dates";
import { parseAmount } from "../money";
import type { PdfDocumentText, PdfLine } from "../pdf/lines";
import { cleanMerchantName, maskAccountNumber } from "../text";
import { firstItemX, firstPageHeader, joinDescription, memoizeByDocument } from "./shared";
import type { ParsedStatement, ParsedTransaction, StatementAccountInfo, StatementBalances, StatementIssue, StatementParser } from "./types";

// Revolut Bank UAB account statements, as exported from the app.
//
// Verified against real statements in both export languages:
//   - English ("EUR Statement", "Account transactions from ...")
//   - Russian ("Выписка для EUR", "Операции по счету с ...")
// including a file holding two concatenated statements, a period with a
// vault product, foreign-currency card payments with fees, and the
// pending / reverted / declined sections.
//
// LAYOUT, AS VERIFIED
//
//   Balance summary            one row per product: opening, out, in, closing
//   Pending from ...           NOT booked - excluded
//   Account transactions from  booked - the current account's lines
//   <Product> transactions     booked - e.g. vaults
//   Reverted / Declined        NOT booked - excluded
//
// A booked row is: date | description | money out | money in | balance.
// Direction comes from WHICH column holds the amount, read from the x
// position of the table header - never from the text. Indented lines
// under a row are its details (counterparty, card, fee, FX rate).

type Product = "current" | "vault";

type Columns = Readonly<{ dateX: number; descriptionX: number; outX: number; inX: number }>;

type SummaryRow = Readonly<{ label: string; opening: number; out: number; in: number; closing: number }>;

type DraftTransaction = {
  bookedOn: IsoDate;
  main: string;
  details: string[];
  counterparty: string | null;
  memo: string | null;
  amountMinor: number;
  balanceAfterMinor: number | null;
  feeMinor: number | null;
  originalAmountMinor: number | null;
  originalCurrency: string | null;
};

type Block = {
  currency: string | null;
  iban: string | null;
  summary: Map<Product, SummaryRow>;
  periods: Map<Product, Readonly<{ start: IsoDate; end: IsoDate }>>;
  transactions: Map<Product, DraftTransaction[]>;
};

type RevolutSection = Readonly<{
  account: StatementAccountInfo;
  balances: StatementBalances;
  transactions: ParsedTransaction[];
}>;

const SUMMARY_TITLE = /^(Balance summary|Сведения о балансе|Краткая информация об остатке средств)$/i;
const EXCLUDED_SECTION = /^(Pending|Reverted|Declined|В статусе ожидания|Отклон|Возвращ|Отмен)/i;
const BOOKED_SECTION = /^(Account transactions from|Операции по сч[её]ту с|.+ transactions from \w|Операции .+ с \d)/i;
const VAULT_WORDS = /(vault|savings|pocket|кош[её]л|сейф|копилк|накоп)/i;
const TABLE_DATE_HEADER = /^(Date|Start date|Дата|Дата начала)$/i;
const OUT_HEADER = /^(Money out|Списания)$/i;
const IN_HEADER = /^(Money in|Пополнения)$/i;
const BANK_NAME_AS_DESCRIPTION = /^Revolut Bank UAB$/i;

function parseRevolutDate(text: string): IsoDate | null {
  return parseEnglishDate(text) ?? parseRussianDate(text);
}

function productFor(label: string): Product {
  return VAULT_WORDS.test(label) ? "vault" : "current";
}

function readColumns(line: PdfLine): Columns | null {
  const first = line.items[0];

  if (!first || !TABLE_DATE_HEADER.test(first.text)) return null;

  const out = line.items.find((item) => OUT_HEADER.test(item.text));
  const incoming = line.items.find((item) => IN_HEADER.test(item.text));
  const description = line.items[1];

  if (!out || !incoming || !description) return null;

  return { dateX: first.x, descriptionX: description.x, outX: out.x, inX: incoming.x };
}

type AmountColumn = "out" | "in" | "balance";

function columnOf(x: number, columns: Columns): AmountColumn {
  if (x < (columns.outX + columns.inX) / 2) return "out";
  if (x < columns.inX + 80) return "in";
  return "balance";
}

function amountItems(line: PdfLine, columns: Columns): Array<{ column: AmountColumn; text: string }> {
  return line.items.filter((item) => item.x >= columns.outX - 12).map((item) => ({ column: columnOf(item.x, columns), text: item.text }));
}

function applyDetailLine(draft: DraftTransaction, line: PdfLine, columns: Columns, currency: string): void {
  const text = line.items[0].text;
  const label = /^([^:]+):\s*(.*)$/.exec(text);
  const key = label?.[1].trim().toLowerCase() ?? "";
  const value = label?.[2].trim() ?? "";

  if (key === "card" || key === "карта") {
    return;
  }

  if (key === "to" || key === "from" || key === "получатель" || key === "отправитель") {
    draft.counterparty = value;
    draft.details.push(text);
    return;
  }

  if (key === "fee" || key === "комиссия") {
    const fee = parseAmount(value, currency);
    if (fee) draft.feeMinor = Math.abs(fee.minor);
    draft.details.push(`${label?.[1]}: ${value}`);
    return;
  }

  if (key === "reference" || key === "реквизиты") {
    draft.memo = value;
    draft.details.push(text);
    return;
  }

  if (/^(Revolut Rate|Курс Revolut|Rate)/i.test(text)) {
    const foreign = amountItems(line, columns)[0];
    const parsed = foreign ? parseAmount(foreign.text) : null;

    if (parsed?.currency && parsed.currency !== currency) {
      draft.originalAmountMinor = draft.amountMinor < 0 ? -Math.abs(parsed.minor) : Math.abs(parsed.minor);
      draft.originalCurrency = parsed.currency;
    }

    draft.details.push(text);
    return;
  }

  draft.details.push(line.items.map((item) => item.text).join(" "));
}

function merchantFor(draft: DraftTransaction): string | null {
  let name = draft.main;

  if (BANK_NAME_AS_DESCRIPTION.test(name) && draft.counterparty) {
    name = draft.counterparty;
  }

  name = name
    .replace(/^(To|From|Payment from|Transfer to|Transfer from)\s+/i, "")
    .replace(/^(Перевод, получатель:|Перевод, отправитель:|Платеж от|Платёж от|Перевод от)\s*/i, "");

  const cleaned = cleanMerchantName(name);
  return cleaned || null;
}

function segment(document: PdfDocumentText): RevolutSection[] {
  const blocks: Block[] = [];
  let block: Block | null = null;
  let pendingCurrency: string | null = null;
  let pendingIban: string | null = null;
  let inSummary = false;
  let activeProduct: Product | null = null;
  let columns: Columns | null = null;
  let current: DraftTransaction | null = null;

  const startBlock = () => {
    block = { currency: pendingCurrency, iban: pendingIban, summary: new Map(), periods: new Map(), transactions: new Map() };
    blocks.push(block);
  };

  for (const line of document.lines) {
    const text = line.text.trim();
    const x = firstItemX(line);

    const currencyTitle = /^([A-Z]{3}) Statement$/.exec(text) ?? /^Выписка для ([A-Z]{3})$/.exec(line.items[0]?.text ?? "");
    if (currencyTitle) {
      pendingCurrency = currencyTitle[1];
      if (block && !(block as Block).currency) (block as Block).currency = pendingCurrency;
      continue;
    }

    // "IBAN" and the number are usually separate items, but pdf.js merges
    // them when they sit close together; accept both.
    const ibanIndex = line.items.findIndex((item) => /^IBAN\b/.test(item.text));
    if (ibanIndex !== -1) {
      const inline = line.items[ibanIndex].text.replace(/^IBAN\s*/, "");
      const value = inline || line.items[ibanIndex + 1]?.text;
      if (value) {
        pendingIban = maskAccountNumber(value);
        continue;
      }
    }

    if (SUMMARY_TITLE.test(text)) {
      startBlock();
      inSummary = true;
      activeProduct = null;
      columns = null;
      current = null;
      continue;
    }

    if (!block) continue;
    const activeBlock: Block = block;
    const currency = activeBlock.currency ?? "EUR";

    if (inSummary) {
      if (/^(Total|Итого)$/i.test(line.items[0]?.text ?? "")) {
        inSummary = false;
        continue;
      }

      const amounts = line.items.slice(1).map((item) => parseAmount(item.text, currency));
      if (line.items.length === 5 && amounts.every((amount) => amount !== null && amount.currency !== null)) {
        const [opening, out, incoming, closing] = amounts.map((amount) => amount!.minor);
        const label = line.items[0].text;
        const product = productFor(label);
        if (!activeBlock.summary.has(product)) {
          activeBlock.summary.set(product, { label, opening, out, in: incoming, closing });
        }
      }
      continue;
    }

    // Section titles sit at the page margin, left of the table.
    if (x < 42 && line.items.length === 1) {
      if (EXCLUDED_SECTION.test(text)) {
        activeProduct = null;
        current = null;
        continue;
      }

      if (BOOKED_SECTION.test(text)) {
        activeProduct = /^(Account transactions|Операции по сч[её]ту)/i.test(text) ? "current" : productFor(text);
        current = null;
        const period = parsePeriodSentence(text);
        if (period && !activeBlock.periods.has(activeProduct)) activeBlock.periods.set(activeProduct, period);
        continue;
      }
    }

    const headerColumns = readColumns(line);
    if (headerColumns) {
      columns = headerColumns;
      current = null;
      continue;
    }

    if (!activeProduct || !columns) continue;

    const bookedOn = x < columns.descriptionX - 10 ? parseRevolutDate(line.items[0].text) : null;

    if (bookedOn) {
      const description = line.items.filter((item) => item.x >= columns!.descriptionX - 6 && item.x < columns!.outX - 12).map((item) => item.text);
      const amounts = amountItems(line, columns);
      const out = amounts.find((amount) => amount.column === "out");
      const incoming = amounts.find((amount) => amount.column === "in");
      const balance = amounts.find((amount) => amount.column === "balance");
      const value = parseAmount((out ?? incoming)?.text ?? "", currency);

      if (!value || value.minor === 0 || (out && incoming)) {
        // An unreadable amount is dropped rather than guessed; the
        // reconciliation check will then surface the gap to the user.
        current = null;
        continue;
      }

      const signed = out ? -Math.abs(value.minor) : Math.abs(value.minor);
      const draft: DraftTransaction = {
        bookedOn,
        main: description.join(" "),
        details: [],
        counterparty: null,
        memo: null,
        amountMinor: signed,
        balanceAfterMinor: balance ? (parseAmount(balance.text, currency)?.minor ?? null) : null,
        feeMinor: null,
        originalAmountMinor: null,
        originalCurrency: null,
      };

      const list = activeBlock.transactions.get(activeProduct) ?? [];
      list.push(draft);
      activeBlock.transactions.set(activeProduct, list);
      current = draft;
      continue;
    }

    // Details are indented exactly under the description column; footer
    // and legal text start elsewhere, so they never attach to a row.
    if (current && Math.abs(x - columns.descriptionX) <= 8) {
      applyDetailLine(current, line, columns, currency);
    }
  }

  const sections: RevolutSection[] = [];

  for (const entry of blocks) {
    const currency = entry.currency ?? "EUR";
    const products: Product[] = ["current", "vault"];

    for (const product of products) {
      const summary = entry.summary.get(product);
      const drafts = entry.transactions.get(product) ?? [];
      const hasMovement = summary ? summary.out !== 0 || summary.in !== 0 : false;

      if (!summary && drafts.length === 0) continue;
      if (product !== "current" && drafts.length === 0 && !hasMovement) continue;

      const period = entry.periods.get(product) ?? entry.periods.get("current") ?? null;

      sections.push({
        account: {
          bankName: "Revolut",
          accountIdentifier: entry.iban,
          currency,
          product,
          suggestedName: product === "vault" ? `Revolut ${currency} vaults` : `Revolut ${currency}`,
        },
        balances: {
          periodStart: period?.start ?? null,
          periodEnd: period?.end ?? null,
          openingBalanceMinor: summary?.opening ?? null,
          closingBalanceMinor: summary?.closing ?? null,
          reportedCreditsMinor: summary?.in ?? null,
          reportedDebitsMinor: summary?.out ?? null,
        },
        transactions: drafts.map((draft) => ({
          bookedOn: draft.bookedOn,
          postedOn: null,
          description: joinDescription([draft.main, ...draft.details]),
          merchant: merchantFor(draft),
          amountMinor: draft.amountMinor,
          currency,
          originalAmountMinor: draft.originalAmountMinor,
          originalCurrency: draft.originalCurrency,
          feeMinor: draft.feeMinor,
          // Revolut statements print no bank transaction id; "Reference"
          // is the payer's free-text memo and stays in the description.
          reference: null,
          balanceAfterMinor: draft.balanceAfterMinor,
        })),
      });
    }
  }

  return sections;
}

const segmentRevolut = memoizeByDocument(segment);

export const revolutParser: StatementParser = {
  id: "revolut",
  bankName: "Revolut",
  verifiedFormats: ["Revolut account statement PDF (English)", "Revolut account statement PDF (Russian)"],

  detectStatement(document) {
    const header = firstPageHeader(document, 12);
    return /Revolut Bank UAB|Revolut Ltd/i.test(header) && /(^|\n)([A-Z]{3} Statement|Выписка для [A-Z]{3})/m.test(header);
  },

  extractAccountInfo(document) {
    return segmentRevolut(document).map((section) => section.account);
  },

  extractStatementBalances(document) {
    return segmentRevolut(document).map((section) => section.balances);
  },

  extractTransactions(document) {
    return segmentRevolut(document).map((section) => section.transactions);
  },

  validateStatement(statement: ParsedStatement): StatementIssue[] {
    const issues: StatementIssue[] = [];

    statement.sections.forEach((section) => {
      if (section.balances.openingBalanceMinor === null) {
        issues.push({
          severity: "warning",
          code: "summary_missing",
          message: `No balance summary row was found for ${section.account.suggestedName}.`,
          sectionIndex: section.index,
          transactionIndex: null,
        });
      }
    });

    return issues;
  },
};
