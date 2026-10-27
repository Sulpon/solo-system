import type { IsoDate } from "../dates";
import type { PdfDocumentText } from "../pdf/lines";

// One transaction exactly as a statement reports it. Amounts are signed
// minor units in the ACCOUNT's currency: positive in, negative out.
export type ParsedTransaction = Readonly<{
  bookedOn: IsoDate;
  postedOn: IsoDate | null;
  // Everything the bank printed for this line, joined. Stored verbatim.
  description: string;
  merchant: string | null;
  amountMinor: number;
  currency: string;
  // Card payment in another currency: the amount charged at the merchant.
  originalAmountMinor: number | null;
  originalCurrency: string | null;
  feeMinor: number | null;
  reference: string | null;
  // Running balance printed next to the line, when the format has one.
  balanceAfterMinor: number | null;
}>;

// Who and what a section of the statement belongs to. A single file can
// hold several: Alatau prints one per currency account, Revolut one per
// product (current account, vaults), and a Revolut export can concatenate
// several periods.
export type StatementAccountInfo = Readonly<{
  bankName: string;
  // Masked, never the full number.
  accountIdentifier: string | null;
  currency: string;
  product: string;
  suggestedName: string;
}>;

export type StatementBalances = Readonly<{
  periodStart: IsoDate | null;
  periodEnd: IsoDate | null;
  openingBalanceMinor: number | null;
  closingBalanceMinor: number | null;
  // Totals the statement itself prints, when it does - a second, independent
  // check on the extracted lines.
  reportedCreditsMinor: number | null;
  reportedDebitsMinor: number | null;
}>;

export type StatementIssueSeverity = "error" | "warning" | "info";

export type StatementIssue = Readonly<{
  severity: StatementIssueSeverity;
  code: string;
  message: string;
  sectionIndex: number | null;
  transactionIndex: number | null;
}>;

export type ParsedSection = Readonly<{
  index: number;
  account: StatementAccountInfo;
  balances: StatementBalances;
  transactions: ReadonlyArray<ParsedTransaction>;
}>;

export type ParsedStatement = Readonly<{
  parserId: string;
  bankName: string;
  sections: ReadonlyArray<ParsedSection>;
  issues: ReadonlyArray<StatementIssue>;
}>;

// The contract every bank parser implements. The three extract* methods
// return one entry per statement section, in the same order, so the
// runner can zip them into ParsedSections. Each must only ever report
// what the document prints: no invented lines, no derived balances.
export interface StatementParser {
  readonly id: string;
  readonly bankName: string;
  // Layout variants this parser was verified against with real statements.
  readonly verifiedFormats: ReadonlyArray<string>;
  detectStatement(document: PdfDocumentText): boolean;
  extractAccountInfo(document: PdfDocumentText): StatementAccountInfo[];
  extractStatementBalances(document: PdfDocumentText): StatementBalances[];
  extractTransactions(document: PdfDocumentText): ParsedTransaction[][];
  // Format-specific checks on top of the shared reconciliation.
  validateStatement(statement: ParsedStatement): StatementIssue[];
}

export class StatementParseError extends Error {
  constructor(
    readonly code: "unrecognized" | "unsupported_bank" | "no_transactions" | "inconsistent",
    message: string,
  ) {
    super(message);
    this.name = "StatementParseError";
  }
}
